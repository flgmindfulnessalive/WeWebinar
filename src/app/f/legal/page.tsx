import Link from "next/link";
import type { Metadata } from "next";

import { Wordmark } from "@/components/wefunnels/wordmark";
import { BackToTop } from "@/components/wefunnels/back-to-top";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";

export const metadata: Metadata = {
  title: "Condiciones y privacidad · WeFunnels",
  robots: { index: false, follow: false },
};

const SHELL = "mx-auto w-full max-w-[760px] px-[clamp(20px,5vw,34px)]";
const H2 =
  "m-0 mt-10 text-[length:var(--wf-h3)] font-bold tracking-[-0.02em] text-[#F3F7FF]";
const BODY = "m-0 mt-3 text-[length:var(--wf-body)] leading-[1.7] text-[#C1D1E6]";
const LI = "text-[length:var(--wf-body)] leading-[1.7] text-[#C1D1E6]";

const SUPPORT_EMAIL = "operaciones@wewebinars.com";

// Condiciones y privacidad.
//
// El formulario de registro dice "aceptas los Términos de uso" y "has leído
// la Política de privacidad", y los dos enlaces apuntaban a /terms y
// /privacy en el host de la app. Ninguna de las dos direcciones existe en
// este proyecto -- ni para WeFunnels ni para WeWebinars: las dos devolvían
// 404 en producción. Pedirle a alguien que acepte un documento que no se
// puede abrir no es un detalle de maquetación.
//
// Lo que hay aquí describe lo que el código hace de verdad: qué se guarda,
// quién lo ve, qué se cobra y qué no caduca. Nada está inventado y nada
// promete lo que la plataforma no cumple. Lo que NO es: un texto revisado
// por un abogado. Las dos cosas que requieren una decisión del negocio --
// la política de devoluciones y la identidad fiscal del responsable -- se
// dicen como lo que son, un canal de contacto, en vez de rellenarse con
// una cláusula imaginada.
export default function WeFunnelsLegalPage() {
  return (
    <main id="top" className="pb-16">
      <BackToTop />

      <header className="border-b border-[#202A3B] py-6">
        <div className={`${SHELL} flex items-center justify-between gap-4`}>
          <Link href="/" className="wf-home" aria-label="WeFunnels, ir al inicio">
            <Wordmark size="sm" />
          </Link>
          <Link
            href="/entrar"
            className="text-[length:var(--wf-small)] font-semibold text-[#43E2EE] no-underline"
          >
            Entrar
          </Link>
        </div>
      </header>

      <div className={`${SHELL} pt-10`}>
        <h1 className="m-0 text-[length:var(--wf-h2)] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance">
          Condiciones y privacidad
        </h1>
        <p className="mt-4 mb-0 text-[length:var(--wf-lead)] leading-relaxed text-[#C1D1E6]">
          Esto describe cómo funciona WeFunnels hoy: qué te damos, qué guardamos y quién
          puede verlo. Está escrito para que se entienda de una lectura.
        </p>

        <h2 className={H2}>Qué es WeFunnels</h2>
        <p className={BODY}>
          Una página personal en {WEFUNNELS_HOST}, un panel con tus visitas y tus
          registros, y un curso grabado. WeFunnels es un producto de WeWebinars, y el
          video del curso está alojado en WeWebinars: por eso, al abrirlo, la dirección
          cambia a la de WeWebinars. Es el mismo producto y la misma cuenta.
        </p>

        <h2 className={H2}>Qué cuesta</h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
          <li className={LI}>
            <strong className="font-semibold text-[#F3F7FF]">Tu funnel: nada.</strong>{" "}
            Gratis de por vida, sin tarjeta y sin mensualidad. No hay ningún cobro
            asociado a una cuenta gratuita.
          </li>
          <li className={LI}>
            <strong className="font-semibold text-[#F3F7FF]">
              La licencia Distribuidor: un pago único.
            </strong>{" "}
            199 dólares en la web oficial. No se renueva, no hay mensualidad y no hay
            nada que cancelar. Incluye 2 meses de Starter de WeWebinars; cuando se
            acaban, nada de WeFunnels se apaga.
          </li>
        </ul>
        <p className={BODY}>
          Los cobros los procesa Whop, que es quien manda el comprobante por correo. Para
          una devolución o un ajuste, escríbenos a{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Devolución de WeFunnels")}`}
            className="font-semibold text-[#43E2EE]"
          >
            {SUPPORT_EMAIL}
          </a>
          : lo tratamos caso por caso, no hay un formulario automático.
        </p>

        <h2 className={H2}>Qué puedes publicar</h2>
        <p className={BODY}>
          Todas las páginas comparten un dominio, así que hay reglas de contenido y se
          aplican de verdad: parte se bloquea en el momento de guardar y parte pasa a
          revisión.{" "}
          <Link href="/reglas" className="font-semibold text-[#43E2EE] no-underline">
            Están escritas aquí, una por una
          </Link>
          . Una página puede suspenderse por incumplirlas; tus registros y tu curso no se
          tocan cuando eso pasa.
        </p>

        <h2 id="privacidad" className={`${H2} scroll-mt-20`}>
          Privacidad: qué guardamos
        </h2>
        <p className={BODY}>Tres cosas, y nada más que estas tres:</p>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
          <li className={LI}>
            <strong className="font-semibold text-[#F3F7FF]">Tu cuenta.</strong> Tu
            nombre, tu email y tu contraseña (cifrada, nunca en claro ni visible para
            nosotros). Si subes una foto a tu página, también esa.
          </li>
          <li className={LI}>
            <strong className="font-semibold text-[#F3F7FF]">Tu página.</strong> El texto
            que escribes en ella y, si lo configuras, el identificador de tu píxel de
            Meta o TikTok -- que es tuyo y manda los datos a tu propia cuenta de
            publicidad, no a la nuestra.
          </li>
          <li className={LI}>
            <strong className="font-semibold text-[#F3F7FF]">
              Quién visita y quién se registra.
            </strong>{" "}
            Un recuento de visitas de tu página, y los datos que cada persona escribe en
            tu formulario: su nombre, y el teléfono, el email o la respuesta que dejó.
          </li>
        </ul>

        <h2 className={H2}>Quién lo ve</h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
          <li className={LI}>
            <strong className="font-semibold text-[#F3F7FF]">
              Tus registros son solo tuyos.
            </strong>{" "}
            Quien te regaló tu funnel no los ve. No es una promesa de buena voluntad: la
            base de datos solo entrega las filas de una página a la cuenta que la posee.
          </li>
          <li className={LI}>
            <strong className="font-semibold text-[#F3F7FF]">
              Tu página publicada es pública.
            </strong>{" "}
            Cualquiera con el enlace la ve, que es justamente para lo que sirve. Mientras
            esté en borrador, no.
          </li>
          <li className={LI}>
            <strong className="font-semibold text-[#F3F7FF]">Nosotros.</strong> Para
            operar la plataforma, atender un reporte de contenido o resolver algo que nos
            pidas.
          </li>
          <li className={LI}>
            <strong className="font-semibold text-[#F3F7FF]">
              Nadie más, y no vendemos nada.
            </strong>{" "}
            Los únicos terceros son los proveedores que hacen funcionar el servicio:
            Supabase (base de datos y cuentas), Vercel (alojamiento), Whop (cobros) y
            Resend (correo).
          </li>
        </ul>

        <h2 className={H2}>Qué puedes hacer con tus datos</h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
          <li className={LI}>
            Cambiar tu nombre, tu email y tu contraseña desde Mi perfil, cuando quieras.
          </li>
          <li className={LI}>
            Retirar tu página de internet desde Mi página, al instante y sin pedírnoslo.
          </li>
          <li className={LI}>
            Pedir que borremos tu cuenta, escribiéndonos desde tu propia dirección. Los
            registros que otras personas dejaron en tu página son constancia de quién
            pidió qué, así que eso se hace a mano y no con un botón.
          </li>
        </ul>

        <h2 className={H2}>Cookies</h2>
        <p className={BODY}>
          Las que hacen falta para que esto funcione, y una más. La de tu sesión, para que
          no tengas que volver a entrar en cada pantalla. Y, cuando alguien abre la página
          de regalo de un distribuidor, una que recuerda de quién era ese enlace durante
          un tiempo limitado: es lo que permite que el funnel se le acredite a la persona
          correcta. No hay cookies de publicidad nuestras. Si configuras tu píxel, las que
          ponga son de tu cuenta y tu responsabilidad.
        </p>

        <h2 className={H2}>Contacto</h2>
        <p className={BODY}>
          Para cualquier cosa de aquí, incluidas las dudas sobre tus datos:{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-semibold text-[#43E2EE]"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>

        <p className="mt-10 mb-0 text-[length:var(--wf-small)] leading-relaxed text-[#8498B4]">
          Última revisión: octubre de 2026. Describe el funcionamiento actual de la
          plataforma. Si cambia algo que te afecte, te lo decimos antes.
        </p>
      </div>
    </main>
  );
}
