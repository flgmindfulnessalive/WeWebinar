-- The per-registrant cap (2 AI replies, see MAX_AI_REPLIES_PER_REGISTRANT
-- in /api/chat/ai-reply) doesn't bound total account spend -- a webinar
-- with no monthly ceiling on registrations (attendee limits are per
-- concurrent session, not per month, see 20260823000006) could still rack
-- up unbounded AI spend simply by attracting more registrants. This adds a
-- second, account-wide monthly ceiling.
alter table public.plans
  add column max_ai_replies_per_month integer;

update public.plans set max_ai_replies_per_month = 400 where key = 'pro';
update public.plans set max_ai_replies_per_month = 1200 where key = 'business';
-- core and enterprise stay null: core has no ai_chat_replies feature at
-- all (irrelevant), enterprise is unlimited/custom same as its other limits.

-- How many AI replies this account has used across all its webinars in the
-- current calendar month -- called from /api/chat/ai-reply (service role)
-- before deciding whether to generate a reply at all, alongside the
-- existing per-registrant check.
create or replace function public.count_account_ai_replies_this_month(p_account_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.registrant_messages rm
  join public.webinars w on w.id = rm.webinar_id
  where w.account_id = p_account_id
    and rm.ai_reply_text is not null
    and rm.ai_replied_at >= date_trunc('month', now());
$$;

grant execute on function public.count_account_ai_replies_this_month(uuid) to service_role;
