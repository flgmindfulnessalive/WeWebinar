-- webinars.presenter_user_id always defaulted to whoever created the
-- webinar (see createWebinar in src/lib/actions/webinars.ts), with no way
-- to change it or to show a presenter who isn't a platform user at all
-- (e.g. an outside speaker with no login). These columns let a host
-- override the shown identity per webinar; when set, they take priority
-- over presenter_user_id's own profile (see resolvePresenter in
-- src/lib/presenter.ts).
alter table public.webinars
  add column presenter_name text,
  add column presenter_avatar_url text,
  add column presenter_bio text;
