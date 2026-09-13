-- "Oferta de la demo oficial" -- 10% de descuento con vencimiento real de 1
-- hora, ofrecido a quien llega al final del webinar de demo oficial de
-- WeWebinars (el mismo que usa el Launchpad y el nuevo link "Ver Demo" del
-- nav de marketing, ver NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL). Reemplaza
-- el cupón fijo (LAUNCHPAD_DISCOUNT_CODE) por un código real y único de
-- Whop (ver src/lib/whop.ts), emitido server-side, nunca en la base de un
-- honor system.
--
-- Sin policy de cliente -- mismo patrón que readiness_assessments/
-- webinar_projects/partner_prospects: la página /demo/oferta y el email de
-- respaldo leen/escriben con el cliente admin (service role), nunca desde
-- el navegador directamente, porque quien la ve nunca tiene sesión de
-- WeWebinars (es un registrante anónimo del webinar, no una cuenta).
create table public.demo_discount_offers (
  id uuid primary key default gen_random_uuid(),
  registrant_id uuid not null references public.registrants (id) on delete cascade,
  webinar_id uuid not null references public.webinars (id) on delete cascade,
  email text not null,
  whop_promo_code_id text not null,
  code text not null,
  amount_off numeric(4, 2) not null default 0.10,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),

  -- Un registrante recibe una sola oferta jamás -- si vuelve a entrar
  -- después de que venció, ve "tu oferta anterior venció" en vez de un
  -- reloj reiniciado; preserva la urgencia real de "1 hora desde que la
  -- viste" en vez de dejarla resetear con cada visita a la página.
  constraint demo_discount_offers_registrant_unique unique (registrant_id)
);
create unique index demo_discount_offers_code_unique on public.demo_discount_offers (code);
create index demo_discount_offers_webinar_id_idx on public.demo_discount_offers (webinar_id);

alter table public.demo_discount_offers enable row level security;
-- No hay policies de cliente a propósito -- ver comentario de la tabla.
