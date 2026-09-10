-- Growth OS MVP 0 -- close the gap flagged in the activation migration's own
-- comments: webinar_created, webinar_published and first_attendee are
-- declared in growth_event_name but nothing emits them yet, so there is no
-- way to break the activation funnel down by acquisition channel (only the
-- aggregate milestone timestamps, computed straight from webinars/
-- registrants, exist so far). This wires the two host-side milestones
-- (webinar_created, webinar_published -- both real browser actions from an
-- authenticated host, so they go through record_growth_event() same as
-- signup_completed) plus first_attendee, which is different: it fires from
-- the anonymous public registration flow, on behalf of the *host's*
-- account, not the registrant -- there is no auth.uid() to resolve there.
--
-- first_attendee only ever happens once per account, so instead of a
-- SELECT-then-INSERT race (two concurrent first registrations both seeing
-- "no milestone yet") this leans on a partial unique index + ON CONFLICT DO
-- NOTHING: cheap, atomic, and safe to call on every single registration
-- without a guard query first.

create unique index growth_events_first_attendee_account_idx
  on public.growth_events (account_id)
  where event_name = 'first_attendee';

create or replace function public.record_first_attendee_if_new(p_account_id uuid, p_webinar_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.growth_events (event_name, account_id, webinar_id)
  values ('first_attendee', p_account_id, p_webinar_id)
  on conflict (account_id) where event_name = 'first_attendee' do nothing;
$$;

-- Called from the public registration action (register_for_webinar's
-- caller), which runs with no session -- same anon-executable posture as
-- register_for_webinar itself.
grant execute on function public.record_first_attendee_if_new(uuid, uuid) to anon, authenticated;
