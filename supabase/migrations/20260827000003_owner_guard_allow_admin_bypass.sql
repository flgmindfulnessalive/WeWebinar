-- guard_user_row_changes()'s "can't remove/demote the last owner" checks
-- protect the app's own "remove teammate" flow (always a real end-user
-- session, so auth.uid() is set), but had no escape hatch for direct admin
-- operations -- Supabase Studio's "Delete user" button, the SQL Editor, or
-- a support script all run as the service role / postgres superuser with
-- auth.uid() = null. That meant a solo test account's owner could never be
-- deleted from Supabase Auth at all, even though deleting the account
-- first (or just cleaning up a throwaway account) is a legitimate admin
-- action nothing else here needs protecting against.
--
-- Gating both checks on auth.uid() is not null keeps the real protection
-- (an end-user can never demote/remove themselves or a teammate down to
-- zero owners) while trusting any operation that isn't running as an
-- authenticated app user.
create or replace function public.guard_user_row_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.account_id is distinct from old.account_id
       and old.account_id is not null
       and not public.is_platform_admin() then
      raise exception 'cannot change an already-assigned account';
    end if;

    if auth.uid() = old.id
       and new.role is distinct from old.role
       and not public.is_platform_admin() then
      raise exception 'cannot change your own role';
    end if;

    if auth.uid() is not null and old.role = 'owner' and new.role <> 'owner' then
      if (select count(*) from public.users where account_id = old.account_id and role = 'owner' and id <> old.id) = 0 then
        raise exception 'cannot demote the last owner of an account';
      end if;
    end if;
  end if;

  if tg_op = 'DELETE' then
    if auth.uid() is not null and old.role = 'owner' then
      if (select count(*) from public.users where account_id = old.account_id and role = 'owner' and id <> old.id) = 0 then
        raise exception 'cannot remove the last owner of an account';
      end if;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;
