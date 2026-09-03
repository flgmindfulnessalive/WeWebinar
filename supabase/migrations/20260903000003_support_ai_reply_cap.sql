-- Per-account daily cap on the Support Agent AI endpoint
-- (/api/support/ai-reply). Unlike the webinar attendee AI chat
-- (registrant_messages / count_account_ai_replies_this_month), which is
-- gated to Pro+ by ai_chat_replies, this endpoint answers the *host* about
-- their own account and is reachable on every plan, the free trial
-- included -- with no request cap of any kind before this. A scripted
-- mass-signup (no CAPTCHA exists yet on /signup) could otherwise loop this
-- endpoint from many free trial accounts and run up unbounded real
-- Anthropic spend. A generous daily ceiling, well above real usage, closes
-- that without touching signup or adding any friction for legitimate hosts.
create table public.support_ai_replies (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index support_ai_replies_account_created_idx
  on public.support_ai_replies (account_id, created_at);

alter table public.support_ai_replies enable row level security;

-- Written and read from the host's own session in the route handler (no
-- service-role client involved there), so RLS -- not a security-definer
-- grant -- is what actually gates this.
create policy support_ai_replies_select on public.support_ai_replies
  for select using (public.is_account_member(account_id));

create policy support_ai_replies_insert on public.support_ai_replies
  for insert with check (public.is_account_member(account_id));

-- How many Support Agent AI replies this account has used today (UTC) --
-- checked from /api/support/ai-reply, using the caller's own session,
-- before deciding whether to spend an Anthropic call answering at all.
create or replace function public.count_account_support_ai_replies_today(p_account_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.support_ai_replies
  where account_id = p_account_id
    and created_at >= date_trunc('day', now());
$$;

grant execute on function public.count_account_support_ai_replies_today(uuid) to authenticated;
