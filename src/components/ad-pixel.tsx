"use client";

import Script from "next/script";

// El píxel de anuncios de una página de WeFunnels. Hasta ahora el editor
// guardaba pixel_provider y pixel_id y ninguna página los pintaba: quien
// pegaba su ID de Meta veía que quedaba guardado y no medía nada.
//
// Va solo en las dos páginas públicas de esa persona -- la suya y su
// página de regalo --, nunca en el panel ni en pantallas de la
// plataforma: el píxel es de su cuenta de anuncios y solo debe ver a
// quien llega a lo que ella reparte.
export type AdPixelProvider = "meta" | "tiktok";

export function AdPixel({
  provider,
  pixelId,
}: {
  provider: AdPixelProvider;
  pixelId: string;
}) {
  if (provider === "tiktok") {
    return (
      <Script id="wefunnels-tiktok-pixel" strategy="afterInteractive">
        {`
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
            ttq.load(${JSON.stringify(pixelId)});
            ttq.page();
          }(window, document, 'ttq');
        `}
      </Script>
    );
  }

  return (
    <Script id="wefunnels-meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', ${JSON.stringify(pixelId)});
        fbq('track', 'PageView');
      `}
    </Script>
  );
}

// La conversión: alguien dejó sus datos. Se dispara desde la pantalla de
// gracias, en el mismo sitio donde el visitante ve que funcionó.
//
// Silenciosa a propósito: si el píxel no cargó (un bloqueador, una red
// lenta, el visitante sin consentimiento), aquí no hay nada que hacer y
// desde luego no hay nada que romperle a quien acaba de registrarse.
export function trackAdPixelLead(provider: AdPixelProvider | null): void {
  if (!provider) return;
  try {
    if (provider === "tiktok") {
      const ttq = (window as unknown as { ttq?: { track: (name: string) => void } }).ttq;
      ttq?.track("SubmitForm");
      return;
    }
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    fbq?.("track", "Lead");
  } catch {
    // Nada: medir no puede estorbar a registrarse.
  }
}
