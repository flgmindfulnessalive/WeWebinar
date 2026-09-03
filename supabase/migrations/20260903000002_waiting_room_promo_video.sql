-- Optional promo/teaser video shown on the public registration page (not the
-- waiting room reached after registering -- by then the visitor is already
-- waiting for the real webinar, so repeating a teaser would be redundant).
-- Lives on waiting_room_config (renamed in the UI to "Registro y sala de
-- espera") rather than webinars, since that table is already the shared home
-- for both the registration-landing background and the waiting-room
-- background (see waiting_room_config.background_url) -- this is the same
-- kind of "landing + waiting" asset, just video-that-plays instead of a
-- decorative loop. Any https URL: YouTube/Vimeo link or a direct file URL,
-- detected at render time the same way the webinar video picker does.
alter table public.waiting_room_config
  add column promo_video_url text;
