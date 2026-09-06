-- WeWe Conversion Intelligence, phase 0: the missing link between the
-- retention data we already collect (viewer_events, get_webinar_retention_
-- curve) and the actual content of the webinar. Today a host can see "35%
-- of attendees left by minute 4" but not *why* -- this table lets a
-- section of the video (Hook, Oferta, Mecanismo unico, etc.) be tagged
-- with a time range, so retention can be read per narrative beat instead
-- of per raw minute.
create type public.content_segment_type as enum (
  'hook', 'promise', 'problem', 'cost_of_inaction', 'story',
  'paradigm_shift', 'unique_mechanism', 'teaching', 'proof',
  'testimonial', 'demonstration', 'objection', 'transition',
  'offer', 'bonus', 'price', 'guarantee', 'urgency', 'cta',
  'qna', 'close'
);
create type public.content_segment_source as enum ('manual', 'ai_suggested');

-- Same shape as public.ctas (timestamp_start_seconds/timestamp_end_seconds):
-- deliberately no check against webinars.duration_seconds here either --
-- that validation lives in the application layer for ctas, not a DB
-- trigger, so this stays consistent instead of introducing a new pattern.
create table public.content_segments (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars (id) on delete cascade,
  segment_type public.content_segment_type not null,
  start_seconds int not null check (start_seconds >= 0),
  end_seconds int not null check (end_seconds > start_seconds),
  source public.content_segment_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_segments_webinar_id_idx on public.content_segments (webinar_id, start_seconds);

create trigger set_updated_at before update on public.content_segments
  for each row execute function public.set_updated_at();

alter table public.content_segments enable row level security;

-- Unlike ctas, this is never rendered to the anonymous attendee -- it's an
-- internal analysis artifact -- so select uses is_account_member (like
-- page_views) instead of can_view_webinar (which would allow anonymous
-- reads once the webinar is published).
create policy content_segments_select on public.content_segments
  for select to authenticated
  using (public.is_account_member((select account_id from public.webinars w where w.id = webinar_id)) or public.is_platform_admin());

-- Same as ctas_manage: only Owner/Editor can create/edit/delete segments.
-- No dedicated write RPC needed for manual edits -- the dashboard can
-- write directly against the table, same as it already does for ctas.
create policy content_segments_manage on public.content_segments
  for all to authenticated
  using (public.can_manage_webinar(webinar_id))
  with check (public.can_manage_webinar(webinar_id));

-- One row per content segment: how many attendees reached it vs. made it
-- through, so a retention dip can be attributed to a specific narrative
-- beat instead of just a raw minute. Same style as
-- get_webinar_retention_curve (20260822000009): plain SQL, security
-- invoker, inherits RLS from viewer_events/content_segments.
create function public.get_webinar_retention_by_segment(p_webinar_id uuid)
returns table (
  segment_id uuid,
  segment_type public.content_segment_type,
  start_seconds int,
  end_seconds int,
  attendees_entering bigint,
  attendees_surviving bigint,
  drop_pct numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with watch as (
    select ve.registrant_id, max(ve.video_timestamp_seconds) as max_position
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.video_timestamp_seconds is not null
    group by ve.registrant_id
  )
  select
    cs.id as segment_id,
    cs.segment_type,
    cs.start_seconds,
    cs.end_seconds,
    count(*) filter (where watch.max_position >= cs.start_seconds) as attendees_entering,
    count(*) filter (where watch.max_position >= cs.end_seconds) as attendees_surviving,
    case
      when count(*) filter (where watch.max_position >= cs.start_seconds) = 0 then null
      else round(100.0 * (
        count(*) filter (where watch.max_position >= cs.start_seconds)
        - count(*) filter (where watch.max_position >= cs.end_seconds)
      ) / count(*) filter (where watch.max_position >= cs.start_seconds), 1)
    end as drop_pct
  from public.content_segments cs
  cross join watch
  where cs.webinar_id = p_webinar_id
  group by cs.id, cs.segment_type, cs.start_seconds, cs.end_seconds
  order by cs.start_seconds;
$$;

grant execute on function public.get_webinar_retention_by_segment(uuid) to authenticated;

-- Bulk upsert for a future AI-assisted segmentation suggestion (not built
-- yet): validates permission once and replaces only the previous
-- ai_suggested rows (never manual ones), so re-generating a suggestion
-- doesn't duplicate or clobber a host's own edits.
create function public.upsert_ai_suggested_segments(p_webinar_id uuid, p_segments jsonb)
returns setof public.content_segments
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.can_manage_webinar(p_webinar_id) then
    raise exception 'not authorized to manage this webinar';
  end if;

  delete from public.content_segments
  where webinar_id = p_webinar_id and source = 'ai_suggested';

  return query
  insert into public.content_segments (webinar_id, segment_type, start_seconds, end_seconds, source)
  select p_webinar_id, (seg->>'segment_type')::public.content_segment_type,
         (seg->>'start_seconds')::int, (seg->>'end_seconds')::int, 'ai_suggested'
  from jsonb_array_elements(p_segments) as seg
  returning *;
end;
$$;

grant execute on function public.upsert_ai_suggested_segments(uuid, jsonb) to authenticated;
