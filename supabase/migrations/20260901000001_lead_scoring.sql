-- Lead scoring: a transparent, weighted-points score per registrant, computed
-- on demand from data that's already collected (viewer_events,
-- registrant_messages) -- no new instrumentation needed. Pro/Business/
-- Enterprise feature, same plan-feature-flag convention as ai_chat_replies
-- (20260827000001) and integrations (20260827000011).
--
-- Points: attended +15, watched% of the video up to +40 (proportional),
-- clicked any CTA +20, answered a poll +10, sent a chat message +10,
-- reacted +5. Max 100, three tiers: frio (0-33) / tibio (34-66) /
-- caliente (67-100).
update public.plans
set features = features || '{"lead_scoring": true}'::jsonb
where key in ('pro', 'business', 'enterprise');

-- Read-only/computed feature (no toggle to gate at write time), so the
-- entitlement check lives in the RPC itself rather than a write-blocking
-- trigger: an account whose plan lacks lead_scoring gets zero rows back,
-- same defense-in-depth intent as the trigger-based features but for a
-- read. RLS on registrants/viewer_events/registrant_messages already
-- restricts everything here to the caller's own account.
create function public.get_webinar_lead_scores(
  p_webinar_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns table (
  registrant_id uuid,
  attended boolean,
  watch_pct numeric,
  clicked_cta boolean,
  answered_poll boolean,
  sent_message boolean,
  reacted boolean,
  score int,
  tier text
)
language sql
stable
security invoker
set search_path = public
as $$
  with entitled as (
    select coalesce((p.features ->> 'lead_scoring')::boolean, false) as allowed
    from public.webinars w
    join public.accounts a on a.id = w.account_id
    join public.plans p on p.id = a.plan_id
    where w.id = p_webinar_id
  ),
  reg_ids as (
    select r.id
    from public.registrants r
    where r.webinar_id = p_webinar_id
      and (p_start_date is null or r.created_at >= p_start_date)
      and (p_end_date is null or r.created_at < p_end_date)
      and (select allowed from entitled)
  ),
  duration as (
    select greatest(coalesce(w.duration_seconds, 0), 1) as seconds
    from public.webinars w
    where w.id = p_webinar_id
  ),
  watch as (
    select ve.registrant_id, max(ve.video_timestamp_seconds) as max_position
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.video_timestamp_seconds is not null
      and ve.registrant_id in (select id from reg_ids)
    group by ve.registrant_id
  ),
  cta as (
    select distinct ve.registrant_id
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.event_type = 'cta_click'
      and ve.registrant_id in (select id from reg_ids)
  ),
  poll as (
    select distinct ve.registrant_id
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.event_type = 'poll_response'
      and ve.registrant_id in (select id from reg_ids)
  ),
  messages as (
    select distinct rm.registrant_id
    from public.registrant_messages rm
    where rm.webinar_id = p_webinar_id
      and rm.registrant_id in (select id from reg_ids)
  ),
  reactions as (
    select distinct ve.registrant_id
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.event_type = 'reaction'
      and ve.registrant_id in (select id from reg_ids)
  ),
  scored as (
    select
      r.id as registrant_id,
      (w.max_position is not null) as attended,
      round(least(1.0, coalesce(w.max_position, 0)::numeric / d.seconds), 4) as watch_pct,
      (c.registrant_id is not null) as clicked_cta,
      (p.registrant_id is not null) as answered_poll,
      (m.registrant_id is not null) as sent_message,
      (rx.registrant_id is not null) as reacted,
      (
        (case when w.max_position is not null then 15 else 0 end) +
        round(least(1.0, coalesce(w.max_position, 0)::numeric / d.seconds) * 40)::int +
        (case when c.registrant_id is not null then 20 else 0 end) +
        (case when p.registrant_id is not null then 10 else 0 end) +
        (case when m.registrant_id is not null then 10 else 0 end) +
        (case when rx.registrant_id is not null then 5 else 0 end)
      )::int as score
    from public.registrants r
    cross join duration d
    left join watch w on w.registrant_id = r.id
    left join cta c on c.registrant_id = r.id
    left join poll p on p.registrant_id = r.id
    left join messages m on m.registrant_id = r.id
    left join reactions rx on rx.registrant_id = r.id
    where r.id in (select id from reg_ids)
  )
  select
    registrant_id, attended, watch_pct, clicked_cta, answered_poll, sent_message, reacted,
    score,
    case when score >= 67 then 'caliente' when score >= 34 then 'tibio' else 'frio' end as tier
  from scored;
$$;

grant execute on function public.get_webinar_lead_scores(uuid, timestamptz, timestamptz) to authenticated;
