-- Real attendee chat messages were already being persisted to
-- registrant_messages (post_registrant_message, since the initial schema),
-- but nothing ever read them back -- no dashboard view existed. This adds:
--   1. A per-webinar opt-in toggle for AI auto-replies in the live chat.
--   2. Columns on registrant_messages to record an AI-generated reply.
--   3. An analytics RPC so hosts can see every real message (and its reply,
--      if any) per registrant.

alter table public.webinars
  add column ai_chat_enabled boolean not null default false;

alter table public.registrant_messages
  add column ai_reply_text text,
  add column ai_replied_at timestamptz;

-- RLS on registrants/registrant_messages already restricts rows to the
-- caller's own account (see 20260822000004_rls_policies.sql), so
-- security invoker is enough, same as the other analytics RPCs.
create or replace function public.get_webinar_registrant_messages(p_webinar_id uuid)
returns table (
  id uuid,
  registrant_id uuid,
  name text,
  email text,
  message_text text,
  video_timestamp_seconds int,
  ai_reply_text text,
  ai_replied_at timestamptz,
  host_replied boolean,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    rm.id,
    rm.registrant_id,
    r.name,
    r.email,
    rm.message_text,
    rm.video_timestamp_seconds,
    rm.ai_reply_text,
    rm.ai_replied_at,
    rm.host_replied,
    rm.created_at
  from public.registrant_messages rm
  join public.registrants r on r.id = rm.registrant_id
  where rm.webinar_id = p_webinar_id
  order by rm.created_at asc;
$$;

grant execute on function public.get_webinar_registrant_messages(uuid) to authenticated;

-- ai_chat_enabled itself needs no new RPC -- webinars already has an
-- UPDATE RLS policy for account owners/editors (see can_manage_webinar
-- usage elsewhere), so a plain .from("webinars").update() from a server
-- action works the same way updateSchedulingMode does.

-- How many of a registrant's messages already got an AI reply -- a basic
-- abuse/cost guard so one visitor spamming the chat box can't run up
-- unbounded LLM spend. Called from the server (service role) before
-- deciding whether to generate a reply at all.
create or replace function public.count_registrant_ai_replies(p_registrant_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.registrant_messages
  where registrant_id = p_registrant_id and ai_reply_text is not null;
$$;

grant execute on function public.count_registrant_ai_replies(uuid) to service_role;
