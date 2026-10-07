-- =========================================================================
-- WeFunnels moderation: the term filter, the review queue, visitor reports
-- and the suspension switch.
--
-- This exists because the product shares a registrable domain with the
-- paying business. WhatsApp and Meta act on the registrable domain, not the
-- subdomain, so a handful of pages selling easy money here can get every
-- link under wewebinars.com flagged -- including the ones belonging to
-- customers who pay. That is the whole reason these barriers ship before
-- the first public page gets traffic rather than after the first incident.
--
-- Nothing here blocks publishing. The promise is that a page goes live the
-- moment its owner says so; what the filter does is put a page in front of
-- a human afterwards, and take down the small set of cases where waiting
-- for a human is the wrong call.
-- =========================================================================

-- =========================================================================
-- Fold text for matching: lowercase, and accents flattened.
--
-- unaccent is not installed in this project, and the match has to survive
-- "Inversión", "INVERSION" and "inversion" alike -- in Spanish that is the
-- normal case, not an evasion attempt. (It also catches the lazy evasions,
-- which is a side benefit, not the point.)
-- =========================================================================
create or replace function public.wefunnel_fold(p_text text)
returns text
language sql
immutable
as $$
  select translate(
    lower(coalesce(p_text, '')),
    'áàäâãéèëêíìïîóòöôõúùüûñç',
    'aaaaaeeeeiiiiooooouuuunc'
  );
$$;

-- =========================================================================
-- The term list
--
-- A table and not a constant in the code, because the entire moderation
-- posture rests on being able to react without a deploy. Severity decides
-- what a match does:
--   'review' -- the page stays up and lands in the queue;
--   'block'  -- the page comes down immediately and lands in the queue.
-- 'block' is reserved for things no legitimate page here ever contains, so
-- that taking a stranger's page down without a human first is defensible.
-- Everything arguable is 'review'.
--
-- Terms are stored folded (see above) and matched on word boundaries, so
-- "cura" does not fire on "curaduría".
-- No client-facing policies: service role and admin only.
-- =========================================================================
create table public.wefunnel_blocked_terms (
  term text primary key,
  severity text not null check (severity in ('review', 'block')),
  rule text not null,
  created_at timestamptz not null default now()
);

insert into public.wefunnel_blocked_terms (term, severity, rule) values
  -- Payment and banking details have no reason to appear on a page whose
  -- only job is to collect a name and a phone number.
  ('iban', 'block', 'datos-bancarios'),
  ('swift', 'block', 'datos-bancarios'),
  ('clabe', 'block', 'datos-bancarios'),
  ('numero de cuenta', 'block', 'datos-bancarios'),
  ('tarjeta de credito', 'block', 'datos-bancarios'),
  -- Crypto is out by rule, so a wallet or an exchange is a hard signal
  -- rather than something to weigh.
  ('bitcoin', 'block', 'criptomonedas'),
  ('usdt', 'block', 'criptomonedas'),
  ('binance', 'block', 'criptomonedas'),
  ('metamask', 'block', 'criptomonedas'),
  ('wallet', 'block', 'criptomonedas'),
  ('cripto', 'review', 'criptomonedas'),
  -- Income claims: the public promise is a free tool, never earnings.
  ('dinero facil', 'review', 'promesas-de-ingresos'),
  ('ingresos pasivos', 'review', 'promesas-de-ingresos'),
  ('libertad financiera', 'review', 'promesas-de-ingresos'),
  ('gana desde casa', 'review', 'promesas-de-ingresos'),
  ('rentabilidad', 'review', 'promesas-de-ingresos'),
  ('inversion', 'review', 'promesas-de-ingresos'),
  ('forex', 'review', 'promesas-de-ingresos'),
  ('trading', 'review', 'promesas-de-ingresos'),
  ('apuestas', 'review', 'promesas-de-ingresos'),
  ('prestamo', 'review', 'promesas-de-ingresos'),
  -- Recruiting belongs in the conversation that happens off the platform,
  -- not on the page.
  ('oportunidad de negocio', 'review', 'reclutamiento'),
  ('plan de compensacion', 'review', 'reclutamiento'),
  ('unete a mi equipo', 'review', 'reclutamiento'),
  ('multinivel', 'review', 'reclutamiento'),
  -- Health claims.
  ('cura', 'review', 'salud'),
  ('curar', 'review', 'salud'),
  ('milagroso', 'review', 'salud'),
  ('antes y despues', 'review', 'salud'),
  ('adelgaza', 'review', 'salud'),
  -- Company and brand names. The rule asks people to talk about what they
  -- offer rather than who they work for, which is also what keeps their
  -- page inside their own company's compliance. This list is a starting
  -- point and grows from the queue, without a deploy.
  ('herbalife', 'review', 'marcas'),
  ('omnilife', 'review', 'marcas'),
  ('amway', 'review', 'marcas'),
  ('natura', 'review', 'marcas')
on conflict (term) do nothing;

-- =========================================================================
-- The queue
--
-- One table for both sources, because a moderator works one list: a filter
-- hit and a visitor report need the same decision taken on them. 'source'
-- says which it was.
-- No client-facing policies: everything goes through the RPCs below or the
-- service role.
-- =========================================================================
create table public.wefunnel_reviews (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.wefunnel_sites (id) on delete cascade,
  source text not null check (source in ('filter', 'report')),
  rule text not null,
  detail text,
  status text not null default 'open' check (status in ('open', 'cleared', 'actioned')),
  resolved_by uuid references public.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index wefunnel_reviews_open_idx on public.wefunnel_reviews (created_at desc)
  where status = 'open';
create index wefunnel_reviews_site_idx on public.wefunnel_reviews (site_id, created_at desc);

-- =========================================================================
-- Scanning
--
-- Split in two triggers on purpose. The BEFORE trigger can change the row
-- it is about to write, which is how a 'block' match takes the page down in
-- the same statement that introduced it -- there is no window where the
-- text is live. The AFTER trigger does the logging, because on INSERT the
-- parent row does not exist yet and a review row referencing it would fail
-- its foreign key.
-- =========================================================================
create or replace function public.wefunnel_matched_rules(
  p_site public.wefunnel_sites,
  p_severity text
)
returns text[]
language sql
stable
as $$
  select coalesce(array_agg(distinct t.rule), '{}'::text[])
  from public.wefunnel_blocked_terms t
  where t.severity = p_severity
    and public.wefunnel_fold(
      concat_ws(' ',
        p_site.display_name, p_site.location, p_site.headline,
        p_site.question_label, array_to_string(p_site.bullets, ' ')
      )
    ) ~ ('(^|[^a-z0-9])' || t.term || '([^a-z0-9]|$)');
$$;

create or replace function public.wefunnel_enforce_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if array_length(public.wefunnel_matched_rules(new, 'block'), 1) > 0 then
    new.status := 'draft'::public.wefunnel_site_status;
    new.suspended_at := coalesce(new.suspended_at, now());
  end if;
  return new;
end;
$$;

create trigger wefunnel_enforce_content
  before insert or update on public.wefunnel_sites
  for each row execute function public.wefunnel_enforce_content();

create or replace function public.wefunnel_log_content_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule text;
  v_severity text;
begin
  foreach v_severity in array array['block', 'review'] loop
    foreach v_rule in array public.wefunnel_matched_rules(new, v_severity) loop
      -- One open entry per rule per page: saving a draft five times should
      -- not put the same page in the queue five times.
      if not exists (
        select 1 from public.wefunnel_reviews
        where site_id = new.id and rule = v_rule and status = 'open'
      ) then
        insert into public.wefunnel_reviews (site_id, source, rule, detail)
        values (new.id, 'filter', v_rule, v_severity);
      end if;

      if v_severity = 'block' and not exists (
        select 1 from public.wefunnel_suspensions
        where site_id = new.id and rule = v_rule and lifted_at is null
      ) then
        insert into public.wefunnel_suspensions (site_id, rule, note)
        values (new.id, v_rule, 'Suspensión automática por el filtro de contenido.');
      end if;
    end loop;
  end loop;

  return null;
end;
$$;

create trigger wefunnel_log_content_review
  after insert or update on public.wefunnel_sites
  for each row execute function public.wefunnel_log_content_review();

-- =========================================================================
-- Visitor reports
--
-- Callable by anyone, because the badge on every page carries a report
-- link and the whole network moderating is the cheapest signal we have.
-- Takes a slug rather than an id so the caller needs nothing but the URL
-- they are already looking at, and returns nothing: whether a page exists,
-- and what happened to a report, are not things a stranger gets told.
--
-- The cap is a flood guard. Twenty open reports is already far more than a
-- moderator needs to act, so past that the signal is in and extra rows are
-- only someone making noise.
-- =========================================================================
create or replace function public.wefunnel_report_site(p_slug text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
  v_open int;
begin
  select id into v_site_id from public.wefunnel_sites where slug = p_slug;
  if v_site_id is null then
    return;
  end if;

  select count(*) into v_open
  from public.wefunnel_reviews
  where site_id = v_site_id and source = 'report' and status = 'open';

  if v_open >= 20 then
    return;
  end if;

  insert into public.wefunnel_reviews (site_id, source, rule, detail)
  values (v_site_id, 'report', 'reporte-de-visitante', left(coalesce(p_note, ''), 1000));
end;
$$;

grant execute on function public.wefunnel_report_site(text, text) to anon, authenticated;

-- =========================================================================
-- The switch
--
-- One call, no deploy, and it is what makes the content rules real: if
-- taking a page down needs a developer, in practice none ever comes down.
-- Suspending also closes the page's open queue entries, because the
-- decision has been taken; lifting leaves them closed, since a moderator
-- who restores a page has already looked.
-- =========================================================================
create or replace function public.wefunnel_set_suspended(
  p_site_id uuid,
  p_suspended boolean,
  p_rule text default 'manual',
  p_note text default null
)
returns public.wefunnel_sites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site public.wefunnel_sites;
begin
  if not public.is_platform_admin() then
    raise exception 'platform admin required';
  end if;

  update public.wefunnel_sites
  set suspended_at = case when p_suspended then coalesce(suspended_at, now()) else null end,
      status = case when p_suspended then 'draft'::public.wefunnel_site_status else status end
  where id = p_site_id
  returning * into v_site;

  if not found then
    raise exception 'wefunnel: no such page';
  end if;

  if p_suspended then
    insert into public.wefunnel_suspensions (site_id, rule, note, suspended_by)
    values (p_site_id, p_rule, p_note, auth.uid());
  else
    update public.wefunnel_suspensions
    set lifted_at = now()
    where site_id = p_site_id and lifted_at is null;
  end if;

  update public.wefunnel_reviews
  set status = case when p_suspended then 'actioned' else 'cleared' end,
      resolved_by = auth.uid(),
      resolved_at = now()
  where site_id = p_site_id and status = 'open';

  return v_site;
end;
$$;

grant execute on function public.wefunnel_set_suspended(uuid, boolean, text, text) to authenticated;

-- =========================================================================
-- Clearing a queue entry without touching the page
-- =========================================================================
create or replace function public.wefunnel_clear_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'platform admin required';
  end if;

  update public.wefunnel_reviews
  set status = 'cleared', resolved_by = auth.uid(), resolved_at = now()
  where id = p_review_id and status = 'open';
end;
$$;

grant execute on function public.wefunnel_clear_review(uuid) to authenticated;

alter table public.wefunnel_blocked_terms enable row level security;
alter table public.wefunnel_reviews enable row level security;

-- Neither table gets a policy. The queue is read by platform admins through
-- the service role, written by the triggers and the report RPC (both
-- definer), and resolved by the RPCs above.
