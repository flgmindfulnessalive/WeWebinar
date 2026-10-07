-- =========================================================================
-- One course room for everybody, not one per distributor.
--
-- 20261007000006 copied the recorded course into each buyer's account. It
-- worked, and it was the wrong shape. Measuring what a distributed funnel
-- actually costs says the funnels are nearly free -- the video is hosted
-- externally, and the free tier sends no mail at all -- while the per-
-- distributor room is not: every attendee writes ~100 viewer_events rows
-- (one heartbeat per 15s, and nothing prunes that table) and pulls 3 to 5
-- emails that get_due_reminder_recipients sends without ever looking at
-- the account's plan or subscription status. A $100 one-time payment was
-- buying an unbounded, permanent room per buyer.
--
-- A single room serves the same promise. "Tu sala con el curso, a tu
-- nombre" is about the address and the name, and
-- wefunnels.wewebinars.com/<nombre>/curso still delivers both: the invite
-- page carries the distributor's name and photo, and the link into the
-- room stamps their referral before the visitor gets there. What the
-- buyer loses is a webinar object inside a WeWebinars dashboard they can
-- only open while their Starter is active -- which is three months, and
-- which is exactly the hook for wanting Starter in the first place.
--
-- The contact is not lost either, and is in fact better placed than it
-- was: registering for the course writes a wefunnel_leads row on the
-- referrer's site, which their WeFunnels panel shows with no plan at all.
-- A copied room put those people in a dashboard that closes the day the
-- subscription lapses.
--
-- So: everything 20261007000006 added comes out, including the two plan-
-- limit exemptions, which existed only because the copy was a published
-- webinar sitting in somebody's account.
-- =========================================================================

drop trigger if exists wefunnel_repoint_course_ctas on public.wefunnel_sites;
drop function if exists public.wefunnel_repoint_course_ctas();
drop function if exists public.wefunnel_mount_missing_course_rooms(uuid);
drop function if exists public.wefunnel_clone_course_webinar(uuid, uuid);
drop function if exists public.wefunnel_personalize_cta_config(jsonb, text);

-- Nothing points at a per-distributor room any more. Dropped rather than
-- left null-forever: a column the code no longer writes is a question
-- every future reader has to answer twice.
alter table public.wefunnel_distributors drop column if exists course_webinar_id;

-- =========================================================================
-- The plan limits go back to what they were
--
-- Both exemptions in 20261007000006 existed for one reason: the copied
-- course room was a published webinar in the buyer's account, and it had
-- to not eat their single Starter slot. With no copy there is no room to
-- exempt, and a webinar in an account is once again simply a webinar.
--
-- enforce_webinar_publish_limit is restored to its body from
-- 20260913000007 (the account row lock included), and
-- enforce_plan_downgrade_limits to its body from 20260822000003.
-- =========================================================================
create or replace function public.enforce_webinar_publish_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int;
  v_current int;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    perform 1 from public.accounts where id = new.account_id for update;

    select p.max_active_webinars into v_max
    from public.accounts a
    join public.plans p on p.id = a.plan_id
    where a.id = new.account_id;

    if v_max is not null then
      select count(*) into v_current
      from public.webinars
      where account_id = new.account_id
        and status = 'published'
        and id <> new.id;

      if v_current >= v_max then
        raise exception 'plan_limit_exceeded: active webinar limit (%) reached for this account', v_max;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_plan_downgrade_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_plan public.plans%rowtype;
  v_published_count int;
  v_user_count int;
begin
  if new.plan_id is distinct from old.plan_id then
    select * into v_new_plan from public.plans where id = new.plan_id;

    if v_new_plan.max_active_webinars is not null then
      select count(*) into v_published_count
      from public.webinars
      where account_id = new.id and status = 'published';

      if v_published_count > v_new_plan.max_active_webinars then
        raise exception 'plan_downgrade_blocked: % published webinars exceed the % plan limit of %',
          v_published_count, v_new_plan.key, v_new_plan.max_active_webinars;
      end if;
    end if;

    if v_new_plan.max_users is not null then
      select count(*) into v_user_count
      from public.users
      where account_id = new.id;

      if v_user_count > v_new_plan.max_users then
        raise exception 'plan_downgrade_blocked: % users exceed the % plan limit of %',
          v_user_count, v_new_plan.key, v_new_plan.max_users;
      end if;
    end if;
  end if;

  return new;
end;
$$;
