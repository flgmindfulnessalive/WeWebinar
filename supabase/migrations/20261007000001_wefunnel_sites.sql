-- =========================================================================
-- WeFunnels: the free personal funnel page.
--
-- WeFunnels is a separate brand on this engine, served from
-- wefunnels.wewebinars.com/<slug>. A person claims a page, fills it in,
-- publishes it, and collects leads from their own form. The giver of a
-- gifted funnel never sees that funnel's leads -- which falls out of the
-- schema for free, because every site belongs to its own account and the
-- leads policy is account-scoped.
--
-- Three things in here exist because the product shares a registrable
-- domain with the paying business (see the model doc's "reputación del
-- dominio compartido"): the reserved-slug table, the suspension column,
-- and the rule that a page is only publicly readable while published AND
-- unsuspended. The admin UI that flips the switch lands in a later slice;
-- the switch itself ships now, because a kill switch added after the first
-- user is a kill switch that arrives late.
-- =========================================================================

create type public.wefunnel_site_status as enum ('draft', 'published');

-- =========================================================================
-- Reserved slugs
--
-- wefunnels.wewebinars.com/<slug> puts every user in one namespace with our
-- own routes, so a slug has to be checked against both the words the app
-- needs and the ones that invite impersonation. Kept as a table rather than
-- a constant in the code so the list can grow without a deploy -- the whole
-- point of the moderation posture is that reacting must not need one.
-- No client-facing policies: service role and admin only.
-- =========================================================================
create table public.wefunnel_reserved_slugs (
  slug text primary key,
  reason text not null,
  created_at timestamptz not null default now()
);

insert into public.wefunnel_reserved_slugs (slug, reason) values
  ('admin', 'system'), ('api', 'system'), ('app', 'system'), ('auth', 'system'),
  ('blog', 'system'), ('cdn', 'system'), ('dashboard', 'system'), ('demo', 'system'),
  ('docs', 'system'), ('edit', 'system'), ('ftp', 'system'), ('help', 'system'),
  ('index', 'system'), ('login', 'system'), ('logout', 'system'), ('mail', 'system'),
  ('new', 'system'), ('panel', 'system'), ('public', 'system'), ('root', 'system'),
  ('settings', 'system'), ('signin', 'system'), ('signup', 'system'), ('static', 'system'),
  ('status', 'system'), ('support', 'system'), ('test', 'system'), ('www', 'system'),
  ('assets', 'system'), ('null', 'system'), ('undefined', 'system'),
  ('account', 'billing'), ('accounts', 'billing'), ('billing', 'billing'),
  ('checkout', 'billing'), ('invoice', 'billing'), ('pay', 'billing'),
  ('payment', 'billing'), ('pricing', 'billing'), ('precios', 'billing'),
  ('about', 'marketing'), ('contact', 'marketing'), ('contacto', 'marketing'),
  ('home', 'marketing'), ('inicio', 'marketing'), ('legal', 'marketing'),
  ('privacy', 'marketing'), ('privacidad', 'marketing'), ('terms', 'marketing'),
  ('terminos', 'marketing'), ('reglas', 'marketing'), ('reportar', 'marketing'),
  ('ayuda', 'marketing'), ('soporte', 'marketing'), ('registro', 'marketing'),
  ('ingresar', 'marketing'), ('salir', 'marketing'),
  ('curso', 'product'), ('cursos', 'product'), ('funnel', 'brand'),
  ('funnels', 'brand'), ('webinar', 'brand'), ('webinars', 'brand'),
  ('wefunnel', 'brand'), ('wefunnels', 'brand'), ('wewebinar', 'brand'),
  ('wewebinars', 'brand')
on conflict (slug) do nothing;

-- =========================================================================
-- The site itself
--
-- One per account, because the free tier is exactly one page and a gifted
-- funnel lands on the recipient's own account, not the giver's.
--
-- The slug is immutable once published (enforced by the trigger below): a
-- name that has circulated in a WhatsApp link must never resolve to someone
-- else later.
-- =========================================================================
create table public.wefunnel_sites (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.accounts (id) on delete cascade,
  slug text not null unique
    constraint wefunnel_sites_slug_format
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'),
  status public.wefunnel_site_status not null default 'draft',

  display_name text not null,
  location text,
  headline text,
  -- At most three, by design: the editor offers exactly three fields. A
  -- longer list is the start of a landing-page builder, which this is not.
  bullets text[] not null default '{}'::text[]
    constraint wefunnel_sites_bullets_max_three
    check (coalesce(array_length(bullets, 1), 0) <= 3),
  -- An external YouTube/Vimeo URL. Shape is validated in the app with the
  -- existing SSRF guard before it ever gets here; the cap is just a
  -- backstop against someone pasting a data: blob into the column.
  video_url text constraint wefunnel_sites_video_url_length check (char_length(video_url) <= 500),
  accent text not null default 'cyan'
    constraint wefunnel_sites_accent_allowed
    check (accent in ('cyan', 'blue', 'violet', 'pink', 'green', 'amber')),

  -- The thank-you screen's WhatsApp button. Digits and an optional leading
  -- +, normalised in the app.
  contact_whatsapp text
    constraint wefunnel_sites_whatsapp_format
    check (contact_whatsapp is null or contact_whatsapp ~ '^\+?[0-9]{7,15}$'),
  -- The one open question the owner picks for their form.
  question_label text,

  -- Ad measurement without letting anyone run code on the shared domain:
  -- we take the pixel ID only and inject the official script ourselves.
  pixel_provider text
    constraint wefunnel_sites_pixel_provider_allowed
    check (pixel_provider is null or pixel_provider in ('meta', 'tiktok')),
  pixel_id text
    constraint wefunnel_sites_pixel_id_format
    check (pixel_id is null or pixel_id ~ '^[A-Za-z0-9]{6,40}$'),
  constraint wefunnel_sites_pixel_pair
    check ((pixel_provider is null) = (pixel_id is null)),

  -- Moderation. A suspended page stops being publicly readable at once
  -- (the select policy below), without deleting anything the owner wrote
  -- or any lead they already collected.
  suspended_at timestamptz,

  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index wefunnel_sites_account_id_idx on public.wefunnel_sites (account_id);
create index wefunnel_sites_live_idx on public.wefunnel_sites (slug)
  where status = 'published' and suspended_at is null;

-- =========================================================================
-- Why a page was suspended
--
-- Kept out of wefunnel_sites because that table is readable by anonymous
-- visitors and RLS is row-level, not column-level: a reason written by a
-- moderator would be served to anyone who asks for the row. Same reasoning
-- as 20260913000008_restrict_public_video_columns.
-- No client-facing policies: admin and service role only.
-- =========================================================================
create table public.wefunnel_suspensions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.wefunnel_sites (id) on delete cascade,
  rule text not null,
  note text,
  suspended_by uuid references public.users (id) on delete set null,
  lifted_at timestamptz,
  created_at timestamptz not null default now()
);
create index wefunnel_suspensions_site_id_idx on public.wefunnel_suspensions (site_id, created_at desc);

-- =========================================================================
-- Leads captured by a site's own form
--
-- WhatsApp sits before email on purpose: it is the channel these owners
-- actually follow up on, and the free tier sends no mail at all.
-- =========================================================================
create table public.wefunnel_leads (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.wefunnel_sites (id) on delete cascade,
  name text not null constraint wefunnel_leads_name_length check (char_length(name) between 1 and 120),
  whatsapp text constraint wefunnel_leads_whatsapp_length check (char_length(whatsapp) <= 32),
  email text constraint wefunnel_leads_email_length check (char_length(email) <= 320),
  answer text constraint wefunnel_leads_answer_length check (char_length(answer) <= 1000),
  created_at timestamptz not null default now()
);
create index wefunnel_leads_site_id_idx on public.wefunnel_leads (site_id, created_at desc);

create trigger set_updated_at before update on public.wefunnel_sites
  for each row execute function public.set_updated_at();

-- =========================================================================
-- Slug guard
--
-- Two rules the app must not be the only thing enforcing, because a second
-- code path (an admin tool, a backfill, the gifting flow in a later slice)
-- would otherwise skip them:
--   1. a reserved slug is never claimable;
--   2. a published site's slug is frozen, and so is a slug that was
--      published once -- a link already in circulation cannot start
--      pointing at a different person.
-- SECURITY DEFINER so the check can read wefunnel_reserved_slugs, which has
-- no client-facing policies. No EXECUTE grant: a trigger function is called
-- by the system, not by a role.
-- =========================================================================
create or replace function public.wefunnel_guard_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.slug is distinct from old.slug and old.published_at is not null then
    raise exception 'wefunnel: the slug is fixed once the page has been published'
      using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.wefunnel_reserved_slugs where slug = new.slug) then
    raise exception 'wefunnel: that name is reserved'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger wefunnel_guard_slug
  before insert or update of slug on public.wefunnel_sites
  for each row execute function public.wefunnel_guard_slug();

-- =========================================================================
-- Row level security
-- =========================================================================
alter table public.wefunnel_reserved_slugs enable row level security;
alter table public.wefunnel_sites enable row level security;
alter table public.wefunnel_suspensions enable row level security;
alter table public.wefunnel_leads enable row level security;

-- wefunnel_reserved_slugs and wefunnel_suspensions get no policies at all:
-- the service role (which bypasses RLS) and platform admins reach them
-- through server code, nobody else.

-- A published, unsuspended page is readable by anyone -- that is the whole
-- product. Everything else about it is readable only by its own account.
create policy wefunnel_sites_select_live on public.wefunnel_sites
  for select to anon, authenticated
  using (status = 'published' and suspended_at is null);

create policy wefunnel_sites_select_members on public.wefunnel_sites
  for select to authenticated
  using (public.is_account_member(account_id) or public.is_platform_admin());

create policy wefunnel_sites_insert_members on public.wefunnel_sites
  for insert to authenticated
  with check (public.is_account_member(account_id));

-- Suspension is not something an owner can lift for themselves, so the
-- check keeps suspended_at as it was. A platform admin goes through the
-- service role, which bypasses this entirely.
create policy wefunnel_sites_update_members on public.wefunnel_sites
  for update to authenticated
  using (public.is_account_member(account_id) and suspended_at is null)
  with check (public.is_account_member(account_id) and suspended_at is null);

-- No DELETE policy: a page is suspended, never deleted out from under the
-- leads it already collected.

-- Anyone can leave their details on a live page; nobody can read them back
-- except the account that owns the page. This is what keeps a gifted
-- funnel's leads invisible to whoever gave it away.
create policy wefunnel_leads_insert_public on public.wefunnel_leads
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.wefunnel_sites s
      where s.id = site_id and s.status = 'published' and s.suspended_at is null
    )
  );

create policy wefunnel_leads_select_owner on public.wefunnel_leads
  for select to authenticated
  using (
    exists (
      select 1 from public.wefunnel_sites s
      where s.id = site_id
        and (public.is_account_member(s.account_id) or public.is_platform_admin())
    )
  );

-- No UPDATE/DELETE policy on leads: the list is an append-only record.
