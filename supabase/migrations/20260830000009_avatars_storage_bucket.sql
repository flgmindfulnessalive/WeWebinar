-- Public bucket for user-uploaded avatar images (account Profile photo,
-- webinar Presenter photo) -- lets hosts upload a JPG/PNG directly instead
-- of only pasting an external URL. Uploads go through a server action
-- (lib/actions/uploads.ts) that authenticates the caller and validates the
-- file in application code, then writes with the service-role client (see
-- lib/supabase/admin.ts) -- the same "authorize in app code, write with
-- admin client" pattern already used for registrants/webhooks elsewhere in
-- this codebase. So no storage.objects RLS policies are needed here: the
-- bucket is public-read (public = true, avatars are shown on public
-- registration/waiting-room/live-room pages), and writes only ever happen
-- through the service-role client, which bypasses RLS entirely.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
