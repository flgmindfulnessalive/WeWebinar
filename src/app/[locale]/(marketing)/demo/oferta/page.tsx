import { getLocale, getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createDemoDiscountCode } from "@/lib/whop";
import { isSelfServePlanKey, createUpgradeCheckoutUrl } from "@/lib/whop";
import { demoDiscountEmail } from "@/lib/platform-email";
import { sendEmail } from "@/lib/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { OfferPanel } from "./offer-panel";

const ONE_HOUR_MS = 60 * 60 * 1000;

// La demo oficial es un webinar real, la misma que usa el Launchpad --
// NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL sigue siendo la única fuente de
// verdad de "cuál es". Se parsea acá (en vez de hardcodear el slug) para
// que renombrar la cuenta (Configuración → General) no rompa esta
// validación -- solo hay que actualizar esa variable de entorno una vez.
function officialDemoSlugs(): { accountSlug: string; webinarSlug: string } | null {
  const raw = process.env.NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL;
  if (!raw) return null;
  try {
    const segments = new URL(raw).pathname.split("/").filter(Boolean);
    const wIndex = segments.indexOf("w");
    if (wIndex === -1 || !segments[wIndex + 1] || !segments[wIndex + 2]) return null;
    return { accountSlug: segments[wIndex + 1], webinarSlug: segments[wIndex + 2] };
  } catch {
    return null;
  }
}

export default async function DemoOfferPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getTranslations("DemoOffer");
  const locale = (await getLocale()) === "en" ? "en" : "es";

  if (!token) {
    return <OfferMessage title={t("invalidTitle")} body={t("invalidBody")} />;
  }

  const supabase = await createClient();
  const { data: sessionRows } = await supabase.rpc("get_registrant_session", { p_access_token: token });
  const session = sessionRows?.[0];
  if (!session) {
    return <OfferMessage title={t("invalidTitle")} body={t("invalidBody")} />;
  }

  const admin = createAdminClient();
  const { data: webinar } = await admin
    .from("webinars")
    .select("slug, account_id")
    .eq("id", session.webinar_id)
    .maybeSingle();
  const { data: account } = webinar
    ? await admin.from("accounts").select("slug").eq("id", webinar.account_id).maybeSingle()
    : { data: null };

  const expectedSlugs = officialDemoSlugs();
  const isOfficialDemo =
    webinar && account && expectedSlugs
      ? webinar.slug === expectedSlugs.webinarSlug && account.slug === expectedSlugs.accountSlug
      : false;

  if (!isOfficialDemo) {
    return <OfferMessage title={t("invalidTitle")} body={t("invalidBody")} />;
  }

  const { data: existingOffer } = await admin
    .from("demo_discount_offers")
    .select("code, expires_at")
    .eq("registrant_id", session.registrant_id)
    .maybeSingle();

  let code = existingOffer?.code ?? null;
  let expiresAt = existingOffer?.expires_at ?? null;

  if (!existingOffer) {
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + ONE_HOUR_MS);
    const newExpiresAt = expiryDate.toISOString();
    const promo = await createDemoDiscountCode({ email: session.email, expiresAt: newExpiresAt });
    if (promo) {
      const { error: insertError } = await admin.from("demo_discount_offers").insert({
        registrant_id: session.registrant_id,
        webinar_id: session.webinar_id,
        email: session.email,
        whop_promo_code_id: promo.whopPromoCodeId,
        code: promo.code,
        expires_at: newExpiresAt,
      });
      if (!insertError) {
        code = promo.code;
        expiresAt = newExpiresAt;

        // Best-effort, nunca debe tumbar la página ya armada con el código.
        try {
          const offerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/demo/oferta?token=${token}`;
          const { subject, html } = demoDiscountEmail(offerUrl, promo.code, locale);
          await sendEmail({ to: session.email, subject, html });
        } catch (err) {
          console.error("[demo/oferta] backup email failed:", err);
        }
      }
    }
  }

  if (!code || !expiresAt) {
    return <OfferMessage title={t("unavailableTitle")} body={t("unavailableBody")} />;
  }

  const isExpired = new Date(expiresAt).getTime() <= new Date(session.server_now).getTime();

  const current = await getCurrentAccount();
  let upgradeUrl: string | null = null;
  if (current && isSelfServePlanKey(current.plan.key)) {
    const purchaseUrl = await createUpgradeCheckoutUrl({
      planKey: current.plan.key,
      billingPeriod: "monthly",
      accountId: current.account.id,
    });
    upgradeUrl = purchaseUrl ? `${purchaseUrl}?promoCode=${code}` : null;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-6 py-16 text-center">
      <OfferPanel
        code={code}
        expiresAt={expiresAt}
        serverNow={session.server_now}
        isExpired={isExpired}
        upgradeUrl={upgradeUrl}
      />
    </div>
  );
}

function OfferMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
