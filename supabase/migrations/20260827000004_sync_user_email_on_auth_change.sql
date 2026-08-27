-- auth.users.email can change after signup (self-service email change via
-- auth.updateUser, or a manual edit in the Supabase dashboard), but
-- public.users.email is only ever set once, at signup, by
-- handle_new_auth_user() (see 20260822000003) -- it silently goes stale
-- the moment the login email changes afterwards. Keep it in sync going
-- forward.
create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.users set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update on auth.users
  for each row execute function public.sync_user_email();
