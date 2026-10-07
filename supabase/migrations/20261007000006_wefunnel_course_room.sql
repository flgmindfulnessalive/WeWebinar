-- =========================================================================
-- WeFunnels: mounting the course in a distributor's own account.
--
-- Slide 26 of the course promises "tu sala con el curso, a tu nombre", and
-- /f/<slug>/curso already renders the room -- but nothing ever filled
-- wefunnel_distributors.course_webinar_id, so the button that opens the
-- course never appeared for anybody. This is the piece that fills it.
--
-- The copy is made here rather than in application code for one reason: a
-- half-copied room (a webinar with no CTAs, or CTAs still pointing at our
-- account) is worse than no room at all, and a function body is a single
-- transaction. duplicateWebinar() in lib/actions/webinars.ts does the same
-- job for a host duplicating their own webinar and may keep doing it in
-- TypeScript -- that one is interactive, same-account, and recoverable by
-- the person who ran it.
--
-- Three things are deliberately NOT carried over from the template:
--
--   facebook_pixel_id and brevo_list_id. They are ours. Copied, every
--   distributor's traffic would fire into our pixel and their registrants
--   would land on our mailing list -- and the copy would not even be made,
--   since enforce_integrations_plan_feature_webinars rejects both columns
--   on any plan without the integrations feature, which includes Starter.
--
--   presenter_user_id. It points at a user row in our account; the room
--   belongs to theirs. The presenter's name, avatar and bio DO carry over,
--   because the recorded voice really is that person -- what the
--   distributor owns is the room and the address, not the authorship.
--
--   Registrants, viewer events and analytics, which belong to the
--   template's own audience.
-- =========================================================================

-- =========================================================================
-- The one personalization the copy needs
--
-- A CTA in the course video sends the viewer off to claim their free
-- funnel, and that claim has to be credited to the distributor whose room
-- it was watched in -- otherwise every gifted funnel in the network counts
-- for whoever owns the template. The template writes the link with a
-- {wefunnel_slug} placeholder (e.g.
-- https://wefunnels.wewebinars.com/r/{wefunnel_slug}) and this resolves it
-- at copy time. Same spirit as the {access_token} placeholder the live
-- room already resolves at render time, except this one can be settled
-- once, because it never varies per viewer.
--
-- The host stays in the template rather than being assembled here: a
-- database function has no business knowing which domain the app is served
-- from, and a human writing the CTA does.
-- =========================================================================
create or replace function public.wefunnel_personalize_cta_config(
  p_config jsonb,
  p_site_slug text
)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case
    when p_config ? 'url' and jsonb_typeof(p_config -> 'url') = 'string'
    then jsonb_set(
      p_config,
      '{url}',
      to_jsonb(replace(p_config ->> 'url', '{wefunnel_slug}', p_site_slug))
    )
    else p_config
  end;
$$;

grant execute on function public.wefunnel_personalize_cta_config(jsonb, text) to service_role;

-- =========================================================================
-- The copy itself
--
-- Idempotent on purpose: the webhook that calls it can be redelivered, the
-- admin backfill below walks every distributor, and both must be safe to
-- run twice. Returns the room's webinar id, or null when there is nothing
-- to do -- not an exception, because none of the failure modes are the
-- buyer's fault and none of them should roll back the activation that paid
-- for the rest of the tier.
--
-- Service role only: it writes across account boundaries by design, which
-- is exactly what no browser session should ever be able to ask for.
-- =========================================================================
create or replace function public.wefunnel_clone_course_webinar(
  p_account_id uuid,
  p_source_webinar_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_site_slug text;
  v_source public.webinars%rowtype;
  v_slug text;
  v_n int := 2;
  v_new_id uuid;
  v_ai_chat boolean;
begin
  -- The row lock is what makes two concurrent calls safe: the second one
  -- waits here and then sees the first one's course_webinar_id.
  select course_webinar_id into v_existing
  from public.wefunnel_distributors
  where account_id = p_account_id
  for update;

  if not found then
    -- Not a distributor. The room is what the tier buys.
    return null;
  end if;

  if v_existing is not null
     and exists (select 1 from public.webinars where id = v_existing) then
    return v_existing;
  end if;

  -- No page, no room: the course CTA has to credit a funnel slug, and a
  -- room whose claim link credits nobody is worse than the panel saying
  -- the course is coming. An account can reach the distributor tier
  -- without ever claiming a WeFunnels page, and /f/<slug>/curso would not
  -- resolve for it either.
  select slug into v_site_slug
  from public.wefunnel_sites
  where account_id = p_account_id;

  if v_site_slug is null then
    return null;
  end if;

  select * into v_source from public.webinars where id = p_source_webinar_id;
  if not found then
    return null;
  end if;

  -- The AI chat is a plan feature, and the template lives on a plan that
  -- has it while the distributor's Starter does not. Carried over blindly
  -- it would not degrade -- enforce_ai_chat_plan_feature would reject the
  -- insert and no room would be mounted at all -- so it is carried over
  -- only where the destination plan allows it.
  select coalesce(v_source.ai_chat_enabled
                  and coalesce((p.features ->> 'ai_chat_replies')::boolean, false), false)
  into v_ai_chat
  from public.accounts a
  left join public.plans p on p.id = a.plan_id
  where a.id = p_account_id;

  v_ai_chat := coalesce(v_ai_chat, false);

  -- 'curso' matches the address the course itself teaches
  -- (wefunnels.wewebinars.com/tunombre/curso). Suffixed on collision
  -- because webinars is unique on (account_id, slug) and the account may
  -- already have a webinar of its own called that.
  v_slug := 'curso';
  while exists (
    select 1 from public.webinars
    where account_id = p_account_id and slug = v_slug
  ) loop
    v_slug := 'curso-' || v_n::text;
    v_n := v_n + 1;
  end loop;

  -- Inserted as a draft and published at the end, after
  -- course_webinar_id is set: the publish-limit trigger below recognises
  -- the room by that column, so it has to exist before the status flips.
  insert into public.webinars (
    account_id, title, slug, description, category,
    video_provider, video_source, duration_seconds,
    schedule_mode, just_in_time_offsets_minutes,
    fake_viewer_min, fake_viewer_max,
    ai_chat_enabled, ai_agent_training_info, ai_chat_use_emojis,
    presenter_name, presenter_avatar_url, presenter_bio,
    status
  )
  values (
    p_account_id, v_source.title, v_slug, v_source.description, v_source.category,
    v_source.video_provider, v_source.video_source, v_source.duration_seconds,
    v_source.schedule_mode, v_source.just_in_time_offsets_minutes,
    v_source.fake_viewer_min, v_source.fake_viewer_max,
    v_ai_chat, v_source.ai_agent_training_info, v_source.ai_chat_use_emojis,
    v_source.presenter_name, v_source.presenter_avatar_url, v_source.presenter_bio,
    'draft'
  )
  returning id into v_new_id;

  insert into public.waiting_room_config (
    webinar_id, template_id, background_url, background_type, promo_video_url,
    headline, subheadline, bullets, show_calendar_button, show_fake_counter, testimonials
  )
  select
    v_new_id, template_id, background_url, background_type, promo_video_url,
    headline, subheadline, bullets, show_calendar_button, show_fake_counter, testimonials
  from public.waiting_room_config
  where webinar_id = p_source_webinar_id;

  -- Copied, unlike in duplicateWebinar(), which drops them on purpose so a
  -- host picks fresh dates. Nobody picks dates for this room: if the
  -- template runs on fixed slots, a copy without them has no sessions at
  -- all and never opens.
  insert into public.webinar_schedules (
    webinar_id, day_of_week, time_of_day, timezone, is_active, exclude_weekends
  )
  select v_new_id, day_of_week, time_of_day, timezone, is_active, exclude_weekends
  from public.webinar_schedules
  where webinar_id = p_source_webinar_id and is_active;

  insert into public.ctas (
    webinar_id, type, timestamp_start_seconds, timestamp_end_seconds, config
  )
  select
    v_new_id, type, timestamp_start_seconds, timestamp_end_seconds,
    public.wefunnel_personalize_cta_config(config, v_site_slug)
  from public.ctas
  where webinar_id = p_source_webinar_id;

  insert into public.chat_messages (
    webinar_id, timestamp_seconds, fake_name, message_text, message_type
  )
  select v_new_id, timestamp_seconds, fake_name, message_text, message_type
  from public.chat_messages
  where webinar_id = p_source_webinar_id;

  insert into public.email_templates (
    account_id, webinar_id, type, reminder_offset_minutes, subject, body, is_active
  )
  select p_account_id, v_new_id, type, reminder_offset_minutes, subject, body, is_active
  from public.email_templates
  where webinar_id = p_source_webinar_id;

  update public.wefunnel_distributors
  set course_webinar_id = v_new_id
  where account_id = p_account_id;

  update public.webinars
  set status = 'published', published_at = now()
  where id = v_new_id;

  return v_new_id;
end;
$$;

grant execute on function public.wefunnel_clone_course_webinar(uuid, uuid) to service_role;

-- =========================================================================
-- The room does not consume the Starter webinar slot
--
-- 20261007000005 says so in prose; this is where it becomes true. The core
-- plan allows exactly one active webinar, so without this exemption the
-- copy above would eat it and a distributor could never publish a webinar
-- of their own -- having just been sold three months of the plan that
-- lets them. Charging someone their only slot to keep distributing our
-- product is charging them to market for us.
--
-- Everything else about the trigger is unchanged from
-- 20260913000007_before_scaling_batch_registration_and_metrics, including
-- the account row lock that serialises concurrent publishes.
--
-- The attendee and monthly-registrant caps are deliberately left alone:
-- those bound concurrency and runaway volume rather than how many rooms
-- somebody runs, they are generous relative to a distributor's first
-- months, and they stop applying entirely once the subscription lapses and
-- plan_id goes null -- which is the moment the promise is really about.
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
    if exists (
      select 1 from public.wefunnel_distributors d
      where d.account_id = new.account_id and d.course_webinar_id = new.id
    ) then
      return new;
    end if;

    perform 1 from public.accounts where id = new.account_id for update;

    select p.max_active_webinars into v_max
    from public.accounts a
    join public.plans p on p.id = a.plan_id
    where a.id = new.account_id;

    if v_max is not null then
      select count(*) into v_current
      from public.webinars w
      where w.account_id = new.account_id
        and w.status = 'published'
        and w.id <> new.id
        and not exists (
          select 1 from public.wefunnel_distributors d
          where d.account_id = w.account_id and d.course_webinar_id = w.id
        );

      if v_current >= v_max then
        raise exception 'plan_limit_exceeded: active webinar limit (%) reached for this account', v_max;
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- =========================================================================
-- ...and it does not block the downgrade either
--
-- The other half of the same promise. After the three included months a
-- distributor who drops Starter is moved to a smaller plan or to none;
-- counting their course room among the published webinars would make that
-- change fail and strand them on a plan they stopped wanting. The room
-- outliving the subscription is the point.
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
      from public.webinars w
      where w.account_id = new.id
        and w.status = 'published'
        and not exists (
          select 1 from public.wefunnel_distributors d
          where d.account_id = new.id and d.course_webinar_id = w.id
        );

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

-- =========================================================================
-- Keeping the credit attached when the slug moves
--
-- wefunnel_sites freezes a slug the moment the page is published, but not
-- before -- and a distributor can buy the tier while their page is still a
-- draft. The claim link baked into their room would then credit a name
-- they no longer own. This re-points it.
--
-- Matched with a boundary ($ or one of / ? #) rather than a bare substring
-- so that renaming "ana" never rewrites the middle of "anabel".
-- =========================================================================
create or replace function public.wefunnel_repoint_course_ctas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_webinar_id uuid;
  v_pattern text;
begin
  select course_webinar_id into v_webinar_id
  from public.wefunnel_distributors
  where account_id = new.account_id;

  if v_webinar_id is null then
    return new;
  end if;

  v_pattern := '(/r/)' || old.slug || '($|[/?#])';

  update public.ctas
  set config = jsonb_set(
    config,
    '{url}',
    to_jsonb(regexp_replace(config ->> 'url', v_pattern, '\1' || new.slug || '\2', 'g'))
  )
  where webinar_id = v_webinar_id
    and config ? 'url'
    and jsonb_typeof(config -> 'url') = 'string'
    and config ->> 'url' ~ v_pattern;

  return new;
end;
$$;

create trigger wefunnel_repoint_course_ctas
  after update of slug on public.wefunnel_sites
  for each row
  when (old.slug is distinct from new.slug)
  execute function public.wefunnel_repoint_course_ctas();

-- =========================================================================
-- Backfill
--
-- Every distributor who bought before the course webinar existed has a
-- null course_webinar_id, and no webhook will ever fire for them again.
-- Run once from /admin/wefunnels after the course is recorded and
-- published; safe to run again, since the copy above returns the existing
-- room rather than making a second one.
-- =========================================================================
create or replace function public.wefunnel_mount_missing_course_rooms(
  p_source_webinar_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_mounted int := 0;
begin
  if not public.is_platform_admin() then
    raise exception 'platform admin required';
  end if;

  for v_account_id in
    select account_id from public.wefunnel_distributors where course_webinar_id is null
  loop
    if public.wefunnel_clone_course_webinar(v_account_id, p_source_webinar_id) is not null then
      v_mounted := v_mounted + 1;
    end if;
  end loop;

  return v_mounted;
end;
$$;

grant execute on function public.wefunnel_mount_missing_course_rooms(uuid) to authenticated;
