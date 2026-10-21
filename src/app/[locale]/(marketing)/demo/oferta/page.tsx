import { getLocale, getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createDemoDiscountCode } from "@/lib/whop";
import { isSelfServePlanKey, createUpgradeCheckoutUrl } from "@/lib/whop";
import { demoDiscountEmail } from "@/lib/platform-email";
import { sendEmail } from "@/lib/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isOfficialDemo } from "@/lib/launchpad/demo-webinar";
import { OfferPanel } from "./offer-panel";

const ONE_HOUR_MS = 60 * 60 * 1000;

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

  // El descuento es solo para quien vio una demo oficial de WeWebinars
  // (la de su idioma o la del otro -- un token sigue siendo válido aunque
  // cambie el locale). Los slugs se derivan de las URLs configuradas en
  // vez de hardcodearse, para que renombrar la cuenta (Configuración →
  // General) no rompa esta validación.
  const fromOfficialDemo =
    webinar && account ? isOfficialDemo(account.slug, webinar.slug) : false;

  if (!fromOfficialDemo) {
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
      if (insertError) {
        // El código ya existe en Whop; si la fila no se guarda, esta
        // pantalla muestra el aviso de error sin decir por qué y el
        // código queda huérfano. Que al menos quede en el registro.
        console.error("[demo/oferta] no se pudo guardar el código emitido:", insertError);
      } else {
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
