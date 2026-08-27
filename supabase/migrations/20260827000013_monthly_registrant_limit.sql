-- The per-session attendee cap (enforce_attendee_limit, max_attendees_per_
-- webinar) bounds concurrency, not monthly volume -- an evergreen
-- just-in-time webinar can start a fresh personal session per visitor
-- indefinitely without ever tripping it, so nothing capped total monthly
-- registrants (and therefore emails) for an account. This adds a second,
-- independent account-wide monthly ceiling -- generous on purpose (well
-- above realistic heavy usage), meant as a safety net against runaway/
-- scripted registration rather than a real usage constraint.
alter table public.plans
  add column max_registrants_per_month integer;

update public.plans set max_registrants_per_month = 1500 where key = 'core';
update public.plans set max_registrants_per_month = 5000 where key = 'pro';
update public.plans set max_registrants_per_month = 20000 where key = 'business';
-- enterprise stays null -- unlimited/custom, same as its other limits.

-- Distinct exception tag from enforce_attendee_limit's plan_limit_exceeded
-- (concurrent attendee limit) -- register.ts needs to tell them apart to
-- show the right message ("try another time slot" doesn't make sense for
-- a monthly cap).
create or replace function public.enforce_monthly_registrant_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_max int;
  v_count int;
begin
  select account_id into v_account_id from public.webinars where id = new.webinar_id;

  select p.max_registrants_per_month into v_max
  from public.accounts a
  join public.plans p on p.id = a.plan_id
  where a.id = v_account_id
  for update of a;

  if v_max is not null then
    select count(*) into v_count
    from public.registrants r
    join public.webinars w on w.id = r.webinar_id
    where w.account_id = v_account_id
      and r.created_at >= date_trunc('month', now());

    if v_count >= v_max then
      raise exception 'registrant_monthly_limit_exceeded: monthly registrant limit (%) reached for this account', v_max;
    end if;
  end if;

  return new;
end;
$$;

create trigger registrants_enforce_monthly_limit
  before insert on public.registrants
  for each row execute function public.enforce_monthly_registrant_limit();
