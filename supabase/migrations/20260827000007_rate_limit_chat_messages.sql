-- post_registrant_message() had no length cap and no rate limit -- any
-- access_token (obtained by registering once) could hit this RPC directly
-- (no need to go through the UI) in a tight loop, inserting unbounded
-- registrant_messages rows, each one also POSTing to /api/chat/ai-reply
-- (see chat-panel.tsx) and burning real Anthropic API spend until that
-- endpoint's own 5-replies-per-registrant cap kicked in -- by which point
-- the chat itself was already spammed.
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
  v_recent_count int;
begin
  select * into v_registrant from public.registrants where access_token = p_access_token;
  if not found then
    raise exception 'invalid access token';
  end if;

  if length(trim(p_message_text)) = 0 then
    raise exception 'message cannot be empty';
  end if;
  if length(p_message_text) > 2000 then
    raise exception 'message too long';
  end if;

  select count(*) into v_recent_count
  from public.registrant_messages
  where registrant_id = v_registrant.id
    and created_at > now() - interval '1 minute';
  if v_recent_count >= 10 then
    raise exception 'rate_limited: too many messages, slow down';
  end if;

  insert into public.registrant_messages (webinar_id, registrant_id, message_text, video_timestamp_seconds)
  values (v_registrant.webinar_id, v_registrant.id, p_message_text, p_video_timestamp_seconds)
  returning * into v_message;

  return v_message;
end;
$$;
