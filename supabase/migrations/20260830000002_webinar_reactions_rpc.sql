-- Every reaction a registrant sent in the live room (one row per tap, same
-- granularity as a chat message), for the Analytics "Reacciones" table --
-- who reacted, with what emoji, and at what point in the video. Filterable
-- by the same p_start_date/p_end_date registrant-cohort range as the rest
-- of the webinar Analytics RPCs (see 20260829000002).
create function public.get_webinar_reactions(
  p_webinar_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns table (
  id uuid,
  registrant_id uuid,
  name text,
  email text,
  emoji text,
  video_timestamp_seconds int,
  occurred_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    ve.id,
    ve.registrant_id,
    r.name,
    r.email,
    coalesce(ve.metadata ->> 'emoji', '❤️') as emoji,
    ve.video_timestamp_seconds,
    ve.occurred_at
  from public.viewer_events ve
  join public.registrants r on r.id = ve.registrant_id
  where ve.webinar_id = p_webinar_id
    and ve.event_type = 'reaction'
    and (p_start_date is null or r.created_at >= p_start_date)
    and (p_end_date is null or r.created_at < p_end_date)
  order by ve.occurred_at desc;
$$;

grant execute on function public.get_webinar_reactions(uuid, timestamptz, timestamptz) to authenticated;
