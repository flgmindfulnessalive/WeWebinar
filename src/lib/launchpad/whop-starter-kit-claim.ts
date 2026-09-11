import "server-only";

import { recordGrowthEventAsAdmin } from "@/lib/growth/record-event-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import { sendEmail } from "@/lib/resend";
import { starterKitAccessEmail, starterKitClaimFailedEmail } from "@/lib/platform-email";

// Same trial tier every other self-serve signup starts on -- see
// TRIAL_PLAN_KEY in lib/actions/account.ts.
const TRIAL_PLAN_KEY = "core";

// This function only ever fires for STARTER_KIT_PRODUCT_ID -- the one Whop
// listing that always redirects buyers to /en/starter-kit (see
// STARTER_KIT_PRODUCT_ID's own comment in lib/whop.ts) -- so the account's
// locale is hardcoded rather than read from any request context (there is
// none at webhook-fire time). If a second Whop listing with a different
// claim path is ever added, this needs to become a real product_id->locale
// map instead.
const ACCOUNT_LOCALE = "en";

// Same ops inbox every other internal alert in this codebase uses
// (lib/actions/leads.ts, app/dashboard/layout.tsx, etc -- there's no
// shared export for it, each caller redefines it locally).
const OPERATIONS_EMAIL = "operaciones@wewebinars.com";

// Every early return below used to be just a console.error: a buyer sees
// "check your email" on /starter-kit and, if any step here fails, silently
// gets nothing, with no record anywhere that it happened. This makes each
// failure an actionable alert instead -- best-effort itself (an alert
// failing must never throw out of the caller that awaits it).
async function notifyOpsOfClaimFailure(details: {
  reason: string;
  membershipId: string;
  whopUserId: string | null;
  email: string | null;
}) {
  try {
    const { subject, html } = starterKitClaimFailedEmail(details);
    await sendEmail({ to: OPERATIONS_EMAIL, subject, html });
  } catch (err) {
    console.error("[whop starter-kit] failure alert itself failed to send:", err);
  }
}

// Claiming the free Evergreen Webinar Starter Kit on Whop's marketplace has
// no signup form -- Whop redirects the buyer straight to /starter-kit with
// a membership already created on its side. This provisions WeWebinars
// access from that webhook alone, using the buyer's email straight off the
// membership.activated payload (data.user.email -- see the webhook route):
// reuse their account if one already exists for that email (never
// duplicate), otherwise create the auth user + trial account + Launchpad
// project, then email a magic link straight into /dashboard/launchpad.
//
// Previously resolved the email via a separate leads.create() Whop API
// call, gated behind the member:email:read permission -- dropped after a
// real claim showed that permission isn't actually granted for this app
// (Whop returned a null email every time) and, more simply, the webhook
// payload already carries the email directly, no extra API call needed.
export async function claimStarterKitFromWhop({
  membershipId,
  whopUserId,
  email: rawEmail,
  name,
}: {
  membershipId: string;
  whopUserId: string | null;
  email: string | null;
  name: string | null;
}): Promise<void> {
  if (!rawEmail) {
    console.error(
      `[whop starter-kit] membership ${membershipId} (user ${whopUserId ?? "?"}) has no email on the webhook payload`
    );
    await notifyOpsOfClaimFailure({
      reason: "El payload del webhook no trae email del comprador (data.user.email vino null/undefined).",
      membershipId,
      whopUserId,
      email: null,
    });
    return;
  }
  const email = rawEmail.trim().toLowerCase();
  const admin = createAdminClient();

  // Claim this membership_id BEFORE doing anything else -- Whop retries a
  // webhook delivery it considers too slow to ack, which used to race a
  // still in-flight first run straight into a second generateLink() call
  // below for the same email. generateLink's one-time-token store keeps a
  // single active token per user, so that second call silently invalidated
  // the first run's token before its email was ever opened: the buyer's
  // first "Starter Kit ready" email died with "already used or expired" on
  // the very first real click, even though nothing was actually reused.
  // Same insert-as-claim pattern as email_sends' dedup insert in the
  // reminders cron -- the unique constraint on membership_id is the atomic
  // gate, so a redelivered webhook for the same membership always loses
  // this race and returns immediately instead of ever reaching
  // generateLink.
  const { error: claimError } = await admin
    .from("whop_starter_kit_webhook_claims")
    .insert({ membership_id: membershipId });
  if (claimError) {
    if (claimError.code === "23505") return;
    console.error(`[whop starter-kit] claim insert failed for membership ${membershipId}:`, claimError.message);
    // Best-effort dedup: a failure here (not a duplicate -- some other
    // write error) must never block a real claim from being provisioned,
    // so fall through and keep going rather than returning.
  }

  // generateLink creates the auth user when one doesn't exist yet (see
  // GoTrueAdminApi.generateLink's own doc comment) and, either way, hands
  // back the token this buyer's access email needs -- one call answers
  // both "does this email already have a WeWebinars login" and produces
  // the eventual magic link, instead of a separate createUser step.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !link?.user) {
    console.error(`[whop starter-kit] generateLink failed for ${email}:`, linkError?.message);
    await notifyOpsOfClaimFailure({
      reason: `generateLink (magic link) falló: ${linkError?.message ?? "sin detalle"}.`,
      membershipId,
      whopUserId,
      email,
    });
    return;
  }

  const { data: userRow } = await admin
    .from("users")
    .select("account_id")
    .eq("id", link.user.id)
    .maybeSingle();

  let accountId = userRow?.account_id ?? null;

  if (accountId) {
    // Idempotency + no-duplicate guard: a redelivered webhook, or this same
    // buyer claiming a second free listing later, is a no-op once their
    // account is already marked.
    const { data: account } = await admin
      .from("accounts")
      .select("whop_starter_kit_claimed_at")
      .eq("id", accountId)
      .maybeSingle();
    if (account?.whop_starter_kit_claimed_at) return;
  } else {
    const { data: plan } = await admin
      .from("plans")
      .select("id")
      .eq("key", TRIAL_PLAN_KEY)
      .single();
    if (!plan) {
      console.error(`[whop starter-kit] plan '${TRIAL_PLAN_KEY}' not found`);
      await notifyOpsOfClaimFailure({
        reason: `El plan '${TRIAL_PLAN_KEY}' no existe en la tabla plans.`,
        membershipId,
        whopUserId,
        email,
      });
      return;
    }

    const accountName = name?.trim() || email.split("@")[0];
    const baseSlug = slugify(accountName) || "cuenta";
    let slug = baseSlug;
    let created: { id: string } | null = null;

    // Rare race: two Starter Kit claims picking the same display name at
    // the same moment. Retry a few times with a numeric suffix, same
    // pattern as createAccount().
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const { data, error } = await admin
        .from("accounts")
        .insert({
          name: accountName,
          slug,
          plan_id: plan.id,
          subscription_status: "trialing",
          locale: ACCOUNT_LOCALE,
        })
        .select("id")
        .single();
      if (!error) {
        created = data;
      } else if (error.code === "23505") {
        slug = `${baseSlug}-${attempt + 2}`;
      } else {
        console.error(`[whop starter-kit] account insert failed for ${email}:`, error.message);
        await notifyOpsOfClaimFailure({
          reason: `Falló la creación de la cuenta: ${error.message}.`,
          membershipId,
          whopUserId,
          email,
        });
        return;
      }
    }
    if (!created) {
      console.error(`[whop starter-kit] could not allocate a unique slug for ${email}`);
      await notifyOpsOfClaimFailure({
        reason: "No se pudo generar un slug único para la cuenta tras varios intentos.",
        membershipId,
        whopUserId,
        email,
      });
      return;
    }

    const { error: attachError } = await admin
      .from("users")
      .update({ account_id: created.id, role: "owner", password_set: false })
      .eq("id", link.user.id);
    if (attachError) {
      console.error(
        `[whop starter-kit] failed to attach user ${link.user.id} to account ${created.id}:`,
        attachError.message
      );
      await notifyOpsOfClaimFailure({
        reason: `No se pudo asociar el usuario a la cuenta recién creada: ${attachError.message}.`,
        membershipId,
        whopUserId,
        email,
      });
      return;
    }

    accountId = created.id;
  }

  const { data: existingProject } = await admin
    .from("launchpad_projects")
    .select("id")
    .eq("account_id", accountId)
    .maybeSingle();
  if (!existingProject) {
    const { error } = await admin.from("launchpad_projects").insert({ account_id: accountId });
    if (error) {
      console.error(
        `[whop starter-kit] failed to create Launchpad project for account ${accountId}:`,
        error.message
      );
      await notifyOpsOfClaimFailure({
        reason: `No se pudo crear el proyecto de Launchpad para la cuenta ${accountId}: ${error.message}.`,
        membershipId,
        whopUserId,
        email,
      });
      return;
    }
  }

  // Hardcoding type=magiclink here was the actual root cause behind
  // "already used or expired" firing on a genuinely fresh, single, prompt
  // click: generateLink's own verification_type is what GoTrue actually
  // stored the one-time token as, and for a brand-new email (every buyer
  // on this claim path, since the auth user gets created right here) that
  // comes back as "signup", not "magiclink" -- confirmed via Supabase's
  // auth logs, which showed a single generateLink + a single verifyOtp
  // call 25s apart, verifyOtp failing with error_code "otp_expired" /
  // "One-time token not found" because it was querying for a token of
  // type magiclink that was actually stored as type signup. Using the
  // type GoTrue actually assigned keeps this correct for both a new user
  // (signup) and an existing one claiming a second time (magiclink).
  const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?token_hash=${link.properties.hashed_token}&type=${link.properties.verification_type}&next=/dashboard/launchpad`;

  try {
    const { subject, html } = starterKitAccessEmail(magicLink, ACCOUNT_LOCALE);
    await sendEmail({ to: email, subject, html });
  } catch (err) {
    console.error(`[whop starter-kit] access email failed for ${email}:`, err);
    await notifyOpsOfClaimFailure({
      reason: `La cuenta y el Launchpad se crearon bien, pero el envío del email de acceso falló: ${
        err instanceof Error ? err.message : String(err)
      }. El comprador nunca recibió su link.`,
      membershipId,
      whopUserId,
      email,
    });
    return;
  }

  await admin
    .from("accounts")
    .update({ whop_starter_kit_claimed_at: new Date().toISOString() })
    .eq("id", accountId);

  // Growth OS: el claim gratuito de Whop es un canal de adquisición propio
  // (marketplace), distinto de alguien que llega orgánicamente a
  // /starter-kit y usa el Launchpad -- por eso su propio lead_magnet_id en
  // vez de "launchpad". No hay auth.uid() ni cookie de anónimo acá (esto
  // corre desde un webhook, sin request de browser detrás), así que usa el
  // insert directo con el cliente admin en vez de record_growth_event().
  // Best-effort: nunca debe tumbar el claim ya completado arriba.
  try {
    await recordGrowthEventAsAdmin(admin, {
      eventName: "lead_magnet_completed",
      accountId,
      userId: link.user.id,
      leadMagnetId: "starter_kit",
      metadata: { membership_id: membershipId },
    });
  } catch (err) {
    console.error(`[whop starter-kit] growth event failed for ${email}:`, err);
  }
}
