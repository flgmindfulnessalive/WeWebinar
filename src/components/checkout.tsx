import { redirect } from "next/navigation";

import { createTrialCheckoutConfig, type BillingPeriod, type SelfServePlanKey } from "@/lib/whop";

// Server component: creates the account-scoped, trial checkout
// configuration (needs the secret Whop API key, so it can't happen
// client-side) and manda a la página de pago de Whop.
//
// Aquí vivía un formulario incrustado, y no funcionaba. WhopCheckoutEmbed
// acepta `planId` o `sessionId`, y lo que esto crea es un id de
// CONFIGURACIÓN de checkout --- otro objeto de Whop, que el formulario no
// sabe resolver: enseñaba «This checkout is no longer available» mientras
// la página de Whop cobraba el mismo plan sin problema. Se vio primero en
// la licencia de WeFunnels y esta pantalla tenía la misma confusión, con
// el comentario de antes diciéndolo sin darse cuenta: «hands the
// resulting configuration id to the client embed as sessionId».
//
// Las salidas que no sirven, por si alguien las vuelve a pensar: `planId`
// a secas pierde el account_id de los metadatos, y sin él el webhook cobra
// sin activarle el plan a nadie; y crear una sesión de verdad no se puede,
// porque el SDK solo expone checkoutConfigurations --- comprobado también
// contra @whop/checkout 0.7.0, donde checkoutConfigurationId sigue siendo
// solo del botón exprés.
//
// No se pierde nada por el camino: la página de Whop ofrece Apple Pay,
// Google Pay, tarjeta y cuotas, y vuelve por el redirect_url que la propia
// configuración lleva puesto. Es además lo que ya hacía
// createUpgradeCheckoutUrl para todos los demás caminos de cobro.
export async function Checkout({
  plan,
  billingPeriod,
  accountId,
  promoCode,
}: {
  plan: SelfServePlanKey;
  billingPeriod: BillingPeriod;
  accountId: string;
  promoCode?: string;
}) {
  const config = await createTrialCheckoutConfig({ planKey: plan, billingPeriod, accountId });

  if (!config?.purchaseUrl) {
    return <p>No se pudo iniciar el checkout. Intenta de nuevo en unos minutos.</p>;
  }

  // Sin código, directo: un paso de más antes de pagar se abandona.
  if (!promoCode) {
    redirect(config.purchaseUrl);
  }

  // Con código, no. El formulario incrustado lo aplicaba solo, y la página
  // de Whop lo pide a mano en «Agregar código promocional». Mandar a
  // alguien allí sin enseñárselo sería cobrarle el precio entero teniendo
  // un descuento ganado.
  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-background p-6 text-center">
      <div>
        <h1 className="m-0 text-xl font-semibold">Tu descuento está listo</h1>
        <p className="m-0 mt-2 text-sm text-muted-foreground">
          Cópialo ahora: en la página de pago se pega en «Agregar código promocional».
        </p>
      </div>
      <p className="m-0 rounded-lg border border-dashed bg-muted/50 px-4 py-3 font-mono text-lg font-semibold tracking-wider">
        {promoCode}
      </p>
      <a
        href={config.purchaseUrl}
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground no-underline"
      >
        Continuar al pago →
      </a>
    </div>
  );
}
