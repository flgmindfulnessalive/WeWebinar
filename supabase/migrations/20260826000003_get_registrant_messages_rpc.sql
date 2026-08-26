-- Attendee-facing chat only ever showed each browser's own sent messages
-- from local React state, so a page refresh during the live webinar lost
-- them (and any AI reply already recorded). This RPC lets ChatPanel
-- restore the registrant's own messages on mount, same token-auth pattern
-- as post_registrant_message.
create or replace function public.get_registrant_messages(p_access_token uuid)
returns table (
  id uuid,
  message_text text,
  video_timestamp_seconds int,
  ai_reply_text text,
  ai_replied_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    rm.id,
    rm.message_text,
    rm.video_timestamp_seconds,
    rm.ai_reply_text,
    rm.ai_replied_at,
    rm.created_at
  from public.registrant_messages rm
  join public.registrants r on r.id = rm.registrant_id
  where r.access_token = p_access_token
  order by rm.created_at asc;
$$;

grant execute on function public.get_registrant_messages(uuid) to anon, authenticated;
