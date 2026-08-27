-- Per-webinar Meta (Facebook) Pixel ID, set from the wizard's "Marketing"
-- step. Per-webinar rather than per-account because different webinars
-- are usually different ad campaigns/audiences that a host wants tracked
-- separately in Ads Manager.
alter table public.webinars
  add column facebook_pixel_id text;
