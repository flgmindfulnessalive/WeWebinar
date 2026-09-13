-- WW-P1-009: `webinars_select_public` is a row-level RLS policy
-- (`using (status = 'published')`) -- Postgres RLS has no column
-- granularity, so once a row is visible, every column is visible,
-- including `video_provider`/`video_source`. Any anonymous visitor of a
-- public registration page can already resolve a webinar's id from the
-- page itself, then query the Supabase REST endpoint directly with the
-- public anon key:
--
--   select video_provider, video_source, duration_seconds
--   from webinars where id = '<uuid>'
--
-- This fully defeats Vimeo's own privacy-hash protection (the whole point
-- of that feature is that only someone holding the id+hash pair can view
-- the video), exposes a direct-URL host's raw storage URL to unauthenticated
-- hotlinking, and bypasses the live room's entire pacing/CTA/analytics
-- model for YouTube -- all with no registration, no waiting for the
-- session to start, and no exposure to any of the room's own gating.
--
-- Fix: `anon` no longer gets blanket column access to `webinars` at all --
-- only the specific columns already consumed by the public-facing pages
-- (registration page, waiting room, OG image, the post-registration email
-- lookup in register.ts), which excludes video_provider/video_source.
-- The one legitimate anon consumer of those two columns -- the live room,
-- which needs them to actually play the video for a token-holding
-- registrant -- moves to a new SECURITY DEFINER RPC that checks the same
-- "webinar is published" condition the direct query used, so the video
-- config is still only reachable once a registrant has a valid access
-- token, not by anyone who merely knows the webinar's id.
--
-- Known remaining gap, not closed by this migration: `webinars_select_
-- public` still applies `to authenticated` too, and column grants can't
-- distinguish "authenticated AND an actual member of this account" from
-- "authenticated but a stranger to this webinar" for the same `authenticated`
-- role -- an authenticated non-member could still read these two columns
-- directly. Closing that fully requires moving every dashboard call site
-- that reads video_provider/video_source off the base table onto a
-- members-checked path too, which is a larger refactor than this migration
-- scopes to. This migration closes the anonymous-visitor vector the
-- finding's own reproduction actually demonstrates (no login required at
-- all); see OPEN_QUESTIONS.md in the audit folder for the follow-up.
revoke select on public.webinars from anon;

grant select (
  id, account_id, presenter_user_id, presenter_name, presenter_avatar_url, presenter_bio,
  facebook_pixel_id, brevo_list_id, title, slug, description, category,
  duration_seconds, schedule_mode, just_in_time_offsets_minutes, status,
  attendee_count, fake_viewer_min, fake_viewer_max, ai_chat_enabled,
  ai_agent_training_info, ai_chat_use_emojis, published_at, archived_at,
  created_at, updated_at
) on public.webinars to anon;

create function public.get_webinar_video_for_registrant(p_access_token uuid)
returns table (
  video_provider public.video_provider,
  video_source text
)
language sql
stable
security definer
set search_path = public
as $$
  select w.video_provider, w.video_source
  from public.registrants r
  join public.webinars w on w.id = r.webinar_id
  where r.access_token = p_access_token
    and w.status = 'published';
$$;

grant execute on function public.get_webinar_video_for_registrant(uuid) to anon, authenticated;
