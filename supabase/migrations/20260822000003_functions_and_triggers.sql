-- =========================================================================
-- Generic updated_at maintenance
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.webinars
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.waiting_room_config
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.ctas
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.email_templates
  for each row execute function public.set_updated_at();

-- =========================================================================
-- RLS helper functions (SECURITY DEFINER so they don't recurse into RLS
-- on public.users / public.webinars while a policy is being evaluated)
-- =========================================================================
create or replace function public.current_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select account_id from public.users where id = auth.uid();
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create or replace function public.is_account_member(target_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and account_id = target_account_id
  );
$$;

create or replace function public.has_account_role(target_account_id uuid, allowed_roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and account_id = target_account_id
      and role = any(allowed_roles)
  );
$$;

create or replace function public.can_manage_webinar(target_webinar_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_account_role(
    (select account_id from public.webinars where id = target_webinar_id),
    array['owner', 'editor']::public.user_role[]
  ) or public.is_platform_admin();
$$;

create or replace function public.can_view_webinar(target_webinar_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.webinars where id = target_webinar_id and status = 'published')
    or public.is_account_member((select account_id from public.webinars where id = target_webinar_id))
    or public.is_platform_admin();
$$;

grant execute on function public.current_account_id() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_account_member(uuid) to authenticated;
grant execute on function public.has_account_role(uuid, public.user_role[]) to authenticated;
grant execute on function public.can_manage_webinar(uuid) to authenticated;
grant execute on function public.can_view_webinar(uuid) to anon, authenticated;

-- =========================================================================
-- Auto-create a public.users profile row when someone signs up.
-- If a pending invitation matches their email, attach them to that
-- account/role directly; otherwise they land account-less and complete
-- onboarding via create_account_with_owner().
-- =========================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.account_invitations%rowtype;
begin
  select * into v_invitation
  from public.account_invitations
  where email = new.email and status = 'pending' and expires_at > now()
  order by created_at desc
  limit 1;

  if found then
    insert into public.users (id, account_id, email, role, display_name)
    values (new.id, v_invitation.account_id, new.email, v_invitation.role, new.raw_user_meta_data ->> 'full_name');

    update public.account_invitations
    set status = 'accepted'
    where id = v_invitation.id;
  else
    insert into public.users (id, account_id, email, role, display_name)
    values (new.id, null, new.email, 'owner', new.raw_user_meta_data ->> 'full_name');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =========================================================================
-- Onboarding RPC: create the tenant account and attach the calling user
-- as its owner. Direct INSERT on accounts is not exposed via RLS.
-- =========================================================================
create or replace function public.create_account_with_owner(
  p_name text,
  p_slug text,
  p_plan_key text default 'core'
)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts;
  v_plan_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if exists (select 1 from public.users where id = auth.uid() and account_id is not null) then
    raise exception 'user already belongs to an account';
  end if;

  select id into v_plan_id from public.plans where key = p_plan_key;
  if v_plan_id is null then
    raise exception 'unknown plan %', p_plan_key;
  end if;

  insert into public.accounts (name, slug, plan_id, subscription_status)
  values (p_name, p_slug, v_plan_id, 'trialing')
  returning * into v_account;

  update public.users
  set account_id = v_account.id, role = 'owner'
  where id = auth.uid();

  return v_account;
end;
$$;

grant execute on function public.create_account_with_owner(text, text, text) to authenticated;

-- =========================================================================
-- Plan limit: block publishing a webinar past plan.max_active_webinars.
-- Draft/archived webinars never count against the limit.
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

create trigger webinars_enforce_publish_limit
  before insert or update on public.webinars
  for each row execute function public.enforce_webinar_publish_limit();

-- =========================================================================
-- Plan limit: block registrations past plan.max_attendees_per_webinar
-- (cumulative across all sessions) and increment the denormalized
-- counter atomically via a row lock on the webinar.
-- =========================================================================
create or replace function public.enforce_attendee_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_webinar public.webinars%rowtype;
  v_max int;
begin
  select * into v_webinar from public.webinars where id = new.webinar_id for update;

  if not found then
    raise exception 'webinar not found';
  end if;

  select p.max_attendees_per_webinar into v_max
  from public.accounts a
  join public.plans p on p.id = a.plan_id
  where a.id = v_webinar.account_id;

  if v_max is not null and v_webinar.attendee_count >= v_max then
    raise exception 'plan_limit_exceeded: attendee limit (%) reached for this webinar', v_max;
  end if;

  update public.webinars set attendee_count = attendee_count + 1 where id = new.webinar_id;

  return new;
end;
$$;

create trigger registrants_enforce_attendee_limit
  before insert on public.registrants
  for each row execute function public.enforce_attendee_limit();

-- =========================================================================
-- Plan limit: block pending invitations past plan.max_users.
-- =========================================================================
create or replace function public.enforce_invitation_user_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int;
  v_current int;
begin
  select p.max_users into v_max
  from public.accounts a
  join public.plans p on p.id = a.plan_id
  where a.id = new.account_id;

  if v_max is not null then
    select
      (select count(*) from public.users where account_id = new.account_id)
      + (select count(*) from public.account_invitations where account_id = new.account_id and status = 'pending')
    into v_current;

    if v_current >= v_max then
      raise exception 'plan_limit_exceeded: user limit (%) reached for this account', v_max;
    end if;
  end if;

  return new;
end;
$$;

create trigger account_invitations_enforce_user_limit
  before insert on public.account_invitations
  for each row execute function public.enforce_invitation_user_limit();

-- =========================================================================
-- Block plan downgrades that would leave an account over its new limits
-- (published webinars or users). Host must archive/remove the excess first.
-- =========================================================================
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

create trigger accounts_enforce_downgrade_limits
  before update on public.accounts
  for each row execute function public.enforce_plan_downgrade_limits();

-- =========================================================================
-- Guard rails on public.users rows:
--  - account_id may only move from NULL to a value (first-time onboarding
--    via create_account_with_owner()); reassigning an already-set
--    account_id is blocked for everyone except a platform admin
--  - a user can never change their own role (no self privilege
--    escalation); only an owner acting on someone else, or a platform
--    admin, can change a role
--  - the last owner of an account can't be demoted or removed
-- =========================================================================
create or replace function public.guard_user_row_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.account_id is distinct from old.account_id
       and old.account_id is not null
       and not public.is_platform_admin() then
      raise exception 'cannot change an already-assigned account';
    end if;

    if auth.uid() = old.id
       and new.role is distinct from old.role
       and not public.is_platform_admin() then
      raise exception 'cannot change your own role';
    end if;

    if old.role = 'owner' and new.role <> 'owner' then
      if (select count(*) from public.users where account_id = old.account_id and role = 'owner' and id <> old.id) = 0 then
        raise exception 'cannot demote the last owner of an account';
      end if;
    end if;
  end if;

  if tg_op = 'DELETE' then
    if old.role = 'owner' then
      if (select count(*) from public.users where account_id = old.account_id and role = 'owner' and id <> old.id) = 0 then
        raise exception 'cannot remove the last owner of an account';
      end if;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger users_guard_changes
  before update or delete on public.users
  for each row execute function public.guard_user_row_changes();

-- =========================================================================
-- Token-authenticated RPCs for anonymous attendees (no Supabase auth
-- session). These are the only write paths into viewer_events and
-- registrant_messages, so no RLS INSERT policy is needed for anon there.
-- =========================================================================
create or replace function public.record_viewer_event(
  p_access_token uuid,
  p_event_type public.viewer_event_type,
  p_video_timestamp_seconds int default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.viewer_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registrant public.registrants%rowtype;
  v_event public.viewer_events;
begin
  select * into v_registrant from public.registrants where access_token = p_access_token;
  if not found then
    raise exception 'invalid access token';
  end if;

  insert into public.viewer_events (registrant_id, webinar_id, event_type, video_timestamp_seconds, metadata)
  values (v_registrant.id, v_registrant.webinar_id, p_event_type, p_video_timestamp_seconds, p_metadata)
  returning * into v_event;

  return v_event;
end;
$$;

grant execute on function public.record_viewer_event(uuid, public.viewer_event_type, int, jsonb) to anon, authenticated;

create or replace function public.post_registrant_message(
  p_access_token uuid,
  p_message_text text,
  p_video_timestamp_seconds int default 0
)
returns public.registrant_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registrant public.registrants%rowtype;
  v_message public.registrant_messages;
begin
  select * into v_registrant from public.registrants where access_token = p_access_token;
  if not found then
    raise exception 'invalid access token';
  end if;

  if length(trim(p_message_text)) = 0 then
    raise exception 'message cannot be empty';
  end if;

  insert into public.registrant_messages (webinar_id, registrant_id, message_text, video_timestamp_seconds)
  values (v_registrant.webinar_id, v_registrant.id, p_message_text, p_video_timestamp_seconds)
  returning * into v_message;

  return v_message;
end;
$$;

grant execute on function public.post_registrant_message(uuid, text, int) to anon, authenticated;

-- =========================================================================
-- Server-computed "live" playback position for an attendee: elapsed time
-- is derived from computed_session_start, never trusted from the client.
-- =========================================================================
create or replace function public.get_registrant_playback_state(p_access_token uuid)
returns table (
  webinar_id uuid,
  elapsed_seconds int,
  duration_seconds int,
  is_ended boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    w.id as webinar_id,
    greatest(0, extract(epoch from (now() - r.computed_session_start))::int) as elapsed_seconds,
    w.duration_seconds,
    (extract(epoch from (now() - r.computed_session_start)) >= coalesce(w.duration_seconds, 0)) as is_ended
  from public.registrants r
  join public.webinars w on w.id = r.webinar_id
  where r.access_token = p_access_token;
$$;

grant execute on function public.get_registrant_playback_state(uuid) to anon, authenticated;
