-- =========================================================================
-- Video propio (Fase 1 de fuentes de video alternativas a YouTube): a host
-- can now point a webinar at a video they host themselves (their own S3/
-- Cloudflare R2/Bunny/whatever CDN link) instead of only YouTube -- no
-- storage or bandwidth cost on our side, same reasoning that took this
-- project from Mux to YouTube (see 20260823000001_youtube_video_source.sql).
--
-- youtube_video_id -> video_source (same column, generalized name -- for
-- 'youtube' it still holds the 11-char video ID; for 'direct_url' it holds
-- the full playable URL), plus a new video_provider column so every reader
-- knows how to interpret it. Vimeo is a planned second addition to the enum
-- once this ships -- not included yet, scoped to what's being built now.
-- =========================================================================
create type public.video_provider as enum ('youtube', 'direct_url');

alter table public.webinars rename column youtube_video_id to video_source;
alter table public.webinars add column video_provider public.video_provider;

update public.webinars set video_provider = 'youtube' where video_source is not null;
