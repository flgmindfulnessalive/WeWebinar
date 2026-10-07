-- =========================================================================
-- The concurrent attendee cap becomes a soft cap.
--
-- Until now enforce_attendee_limit() bounced a registrant the moment the
-- plan's max_attendees_per_webinar was reached. The number is real -- it
-- is sold as 100 / 500 / 1000 (20260828000001) -- but the enforcement was
-- in the wrong place: the person who got refused was a visitor who came to
-- register, not the customer who chose the plan. Turning away the 101st
-- person to protect a line the 100th did not notice costs a lead to make a
-- billing point, and it makes it at the worst possible moment, in the
-- middle of somebody's launch.
--
-- So: let the overage in, write it down, and make the point commercially
-- instead. An account that goes over once is having a good day. An account
-- that goes over every day is on the wrong plan, and the way to say that is
-- an email about upgrading, not a closed door.
--
-- A ceiling still exists, at twice the plan's number, because a cap with no
-- ceiling is not a cap: it is what stops a scripted flood from registering
-- without bound on this axis. Everything between the plan's number and that
-- ceiling is admitted and recorded. ATTENDEE_GRACE_FACTOR below is the one
-- place that multiplier lives.
--
-- What this does NOT change: the window the overlap is counted in. Because
-- 20260823000007 clamps the duration to a one-hour floor, "concurrent" has
-- always meant "registered within the same hour" for any webinar shorter
-- than that -- a 25-minute evergreen room included. The grace band is
-- measured against the same window, so the behaviour people see is simply
-- the old limit with room above it.
-- =========================================================================

-- =========================================================================
-- One row per webinar per day it went over
--
-- A rollup rather than a row per admitted registrant: during a spike the
-- per-registrant table would be the spike, and the only questions anyone
-- asks of it are "how far over" and "how often" -- which is exactly a peak
-- and a count. Keyed on the webinar so an account running two busy
-- webinars reads as two rooms over the line, not one blurred total.
-- =========================================================================
create table public.attendee_overage_days (
  webinar_id uuid not null references public.webinars (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  day date not null,
  -- The plan's number as it stood when the overage happened, so a later
  -- upgrade does not rewrite the history that justified it.
  plan_limit int not null,
  -- The highest overlapping count reached that day, including the
  -- registrant being admitted. This is the number worth quoting back.
  peak_concurrent int not null,
  -- How many registrants were let in above the line that day.
  admissions int not null default 0,
  created_at timestamptz not null default now(),
  primary key (webinar_id, day)
);
create index attendee_overage_days_account_idx
  on public.attendee_overage_days (account_id, day desc);

alter table public.attendee_overage_days enable row level security;

-- An account reads its own, which is what the billing screen shows. Writes
-- come from the trigger below, running as its definer: nobody writes here
-- through RLS, including the account itself.
create policy attendee_overage_days_select_own on public.attendee_overage_days
  for select to authenticated
  using (public.is_account_member(account_id) or public.is_platform_admin());

-- The claim column for the upgrade nudge. Unlike activation_nudge_sent_at
-- this one is meant to fire again: being over the line for a week in March
-- and again in September is two conversations, not one.
alter table public.accounts
  add column attendee_overage_nudge_sent_at timestamptz;

-- =========================================================================
-- The soft cap itself
--
-- Same shape as 20260823000007, with the refusal moved up to the ceiling
-- and the band below it recorded. The row lock on the webinar still
-- serialises concurrent registrations, which is what makes the peak and the
-- count trustworthy rather than racy.
-- =========================================================================
create or replace function public.enforce_attendee_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Twice the plan's number. Change it here and nowhere else.
  ATTENDEE_GRACE_FACTOR constant numeric := 2;
  v_webinar public.webinars%rowtype;
  v_max int;
  v_ceiling int;
  v_duration interval;
  v_new_window_end timestamptz;
  v_concurrent int;
begin
  select * into v_webinar from public.webinars where id = new.webinar_id for update;

  if not found then
    raise exception 'webinar not found';
  end if;

  select p.max_attendees_per_webinar into v_max
  from public.accounts a
  join public.plans p on p.id = a.plan_id
  where a.id = v_webinar.account_id;

  if v_max is not null then
    v_duration := make_interval(secs => greatest(coalesce(v_webinar.duration_seconds, 0), 3600));
    v_new_window_end := new.computed_session_start + v_duration;

    select count(*) into v_concurrent
    from public.registrants r
    where r.webinar_id = new.webinar_id
      and r.computed_session_start < v_new_window_end
      and r.computed_session_start + v_duration > new.computed_session_start;

    v_ceiling := ceil(v_max * ATTENDEE_GRACE_FACTOR)::int;

    -- Still tagged plan_limit_exceeded: register.ts matches on that string
    -- to tell the visitor to pick another time slot, and that is still the
    -- right thing to say here.
    if v_concurrent >= v_ceiling then
      raise exception 'plan_limit_exceeded: concurrent attendee ceiling (%) reached for this session', v_ceiling;
    end if;

    if v_concurrent >= v_max then
      insert into public.attendee_overage_days (
        webinar_id, account_id, day, plan_limit, peak_concurrent, admissions
      )
      values (
        new.webinar_id,
        v_webinar.account_id,
        (now() at time zone 'utc')::date,
        v_max,
        v_concurrent + 1,
        1
      )
      on conflict (webinar_id, day) do update set
        plan_limit = excluded.plan_limit,
        peak_concurrent = greatest(
          public.attendee_overage_days.peak_concurrent,
          excluded.peak_concurrent
        ),
        admissions = public.attendee_overage_days.admissions + 1;
    end if;
  end if;

  update public.webinars set attendee_count = attendee_count + 1 where id = new.webinar_id;

  return new;
end;
$$;

-- =========================================================================
-- The nudge column joins the guarded set
--
-- Same reason trial_warning_sent_at is in there: an owner who can clear it
-- from the browser can make the platform mail them again on every tick.
-- Service role and platform admins only, like the rest.
--
-- Recreated from the definition in 20260903000001 (the Lemon Squeezy
-- rename), which is the live one -- not from 20260827000005, whose body
-- still names the Stripe columns and predates canceled_at and
-- deletion_warning_sent_at joining the set.
-- =========================================================================
create or replace function public.guard_account_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_platform_admin() then
    if new.plan_id is distinct from old.plan_id
      or new.subscription_status is distinct from old.subscription_status
      or new.billing_customer_id is distinct from old.billing_customer_id
      or new.billing_subscription_id is distinct from old.billing_subscription_id
      or new.suspended_at is distinct from old.suspended_at
      or new.grace_period_days is distinct from old.grace_period_days
      or new.trial_ends_at is distinct from old.trial_ends_at
      or new.trial_warning_sent_at is distinct from old.trial_warning_sent_at
      or new.canceled_at is distinct from old.canceled_at
      or new.deletion_warning_sent_at is distinct from old.deletion_warning_sent_at
      or new.attendee_overage_nudge_sent_at is distinct from old.attendee_overage_nudge_sent_at
    then
      raise exception 'cannot modify account billing columns directly';
    end if;
  end if;
  return new;
end;
$$;

-- =========================================================================
-- Who is on the wrong plan
--
-- "Over the line on at least p_min_days distinct days in the last p_days"
-- -- distinct days, so two busy webinars on one afternoon is one day over,
-- not two. One good day is not a signal; a habit is. The cron reads this
-- and mails the owner at most once a month.
-- =========================================================================
create or replace function public.accounts_over_attendee_limit(
  p_days int default 7,
  p_min_days int default 3
)
returns table (
  account_id uuid,
  days_over int,
  peak_concurrent int,
  plan_limit int,
  admissions int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.account_id,
    count(distinct o.day)::int,
    max(o.peak_concurrent)::int,
    max(o.plan_limit)::int,
    sum(o.admissions)::int
  from public.attendee_overage_days o
  where o.day >= (now() at time zone 'utc')::date - greatest(p_days, 1)
  group by o.account_id
  having count(distinct o.day) >= greatest(p_min_days, 1);
$$;

grant execute on function public.accounts_over_attendee_limit(int, int) to service_role;
