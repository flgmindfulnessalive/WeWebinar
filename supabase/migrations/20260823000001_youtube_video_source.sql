-- Swap Mux for an unlisted-YouTube-video source. `duration_seconds` is kept
-- as-is (still populated once, client-side, when the host loads a video) --
-- everything downstream (scheduling, waiting room, analytics) already reads
-- from that column regardless of where the video is hosted.
alter table public.webinars drop column mux_asset_id;
alter table public.webinars rename column mux_playback_id to youtube_video_id;
