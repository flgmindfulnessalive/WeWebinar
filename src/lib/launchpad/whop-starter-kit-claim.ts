import "server-only";

import { createStarterKitLead } from "@/lib/whop";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import { sendEmail } from "@/lib/resend";
import { starterKitAccessEmail, starterKitClaimFailedEmail } from "@/lib/platform-email";

// Same trial tier every other self-serve signup starts on -- see
// TRIAL_PLAN_KEY in lib/actions/account.ts.
const TRIAL_PLAN_KEY = "core";

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
// access from that webhook alone: resolve the buyer's email as a Whop
// lead, reuse their account if one already exists for that email (never
// duplicate), otherwise create the auth user + trial account + Launchpad
// project, then email a magic link straight into /dashboard/launchpad.
export async function claimStarterKitFromWhop({
  membershipId,
  whopUserId,
}: {
  membershipId: string;
  whopUserId: string | null;
}): Promise<void> {
  if (!whopUserId) {
    console.error(`[whop starter-kit] membership ${membershipId} has no user_id -- cannot resolve a lead`);
    await notifyOpsOfClaimFailure({
      reason: "La membership no trae user_id -- no se puede resolver ningún lead.",
      membershipId,
      whopUserId: null,
      email: null,
    });
    return;
  }

  const lead = await createStarterKitLead(whopUserId);
  if (!lead) {
    console.error(
      `[whop starter-kit] could not resolve an email for Whop user ${whopUserId} (membership ${membershipId}) -- is member:email:read enabled on the Whop app?`
    );
    await notifyOpsOfClaimFailure({
      reason:
        "No se pudo resolver el email del comprador en Whop -- revisá si el permiso member:email:read está habilitado en el Whop Developer Dashboard para esta app.",
      membershipId,
      whopUserId,
      email: null,
    });
    return;
  }
  const email = lead.email.trim().toLowerCase();
  const admin = createAdminClient();

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

    const accountName = lead.name?.trim() || email.split("@")[0];
    const baseSlug = slugify(accountName) || "cuenta";
    let slug = baseSlug;
    let created: { id: string } | null = null;

    // Rare race: two Starter Kit claims picking the same display name at
    // the same moment. Retry a few times with a numeric suffix, same
    // pattern as createAccount().
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const { data, error } = await admin
        .from("accounts")
        .insert({ name: accountName, slug, plan_id: plan.id, subscription_status: "trialing" })
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
      .update({ account_id: created.id, role: "owner" })
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

  const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?token_hash=${link.properties.hashed_token}&type=magiclink&next=/dashboard/launchpad`;

  try {
    const { subject, html } = starterKitAccessEmail(magicLink);
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
}
