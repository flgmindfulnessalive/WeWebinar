-- Whether the AI chat reply agent (ai_chat_enabled) is allowed to use
-- emojis in its replies. Defaults to off: the agent's default voice is
-- meant to read as a real team member typing a quick answer, not a bot --
-- hosts who want the friendlier tone can opt back in per webinar.
alter table public.webinars add column ai_chat_use_emojis boolean not null default false;
