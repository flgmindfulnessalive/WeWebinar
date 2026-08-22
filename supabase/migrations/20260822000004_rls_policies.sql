alter table public.plans enable row level security;
alter table public.accounts enable row level security;
alter table public.users enable row level security;
alter table public.platform_admins enable row level security;
alter table public.account_invitations enable row level security;
alter table public.webinars enable row level security;
alter table public.webinar_schedules enable row level security;
alter table public.waiting_room_config enable row level security;
alter table public.webinar_sessions enable row level security;
alter table public.registrants enable row level security;
alter table public.registrant_messages enable row level security;
alter table public.chat_messages enable row level security;
alter table public.ctas enable row level security;
alter table public.viewer_events enable row level security;
alter table public.email_templates enable row level security;
alter table public.enterprise_leads enable row level security;
alter table public.webhook_endpoints enable row level security;

-- =========================================================================
-- plans: public pricing page needs to read it; writes are service-role only
-- (no INSERT/UPDATE/DELETE policy => denied for anon/authenticated).
-- =========================================================================
create policy plans_select_public on public.plans
  for select to anon, authenticated
  using (true);

-- =========================================================================
-- platform_admins: no client-facing policies at all; only the service
-- role (which bypasses RLS) manages this table.
-- =========================================================================

-- =========================================================================
-- accounts
-- =========================================================================
create policy accounts_select_members on public.accounts
  for select to authenticated
  using (public.is_account_member(id) or public.is_platform_admin());

create policy accounts_update_owner on public.accounts
  for update to authenticated
  using (public.has_account_role(id, array['owner']::public.user_role[]) or public.is_platform_admin())
  with check (public.has_account_role(id, array['owner']::public.user_role[]) or public.is_platform_admin());
-- No INSERT policy: accounts are created via create_account_with_owner().
-- No DELETE policy: account deletion is a service-role/admin-only operation.

-- =========================================================================
-- users
-- =========================================================================
create policy users_select_self_or_account on public.users
  for select to authenticated
  using (id = auth.uid() or account_id = public.current_account_id() or public.is_platform_admin());

create policy users_update_self_or_owner on public.users
  for update to authenticated
  using (id = auth.uid() or public.has_account_role(account_id, array['owner']::public.user_role[]) or public.is_platform_admin())
  with check (id = auth.uid() or public.has_account_role(account_id, array['owner']::public.user_role[]) or public.is_platform_admin());

create policy users_delete_owner on public.users
  for delete to authenticated
  using ((public.has_account_role(account_id, array['owner']::public.user_role[]) and id <> auth.uid()) or public.is_platform_admin());
-- No INSERT policy: profile rows are created by handle_new_auth_user().
-- guard_user_row_changes() additionally blocks self privilege-escalation
-- and demoting/removing the last owner, regardless of these policies.

-- =========================================================================
-- account_invitations (Pro/Business team management)
-- =========================================================================
create policy account_invitations_select_owner on public.account_invitations
  for select to authenticated
  using (public.has_account_role(account_id, array['owner']::public.user_role[]) or public.is_platform_admin());

create policy account_invitations_insert_owner on public.account_invitations
  for insert to authenticated
  with check (public.has_account_role(account_id, array['owner']::public.user_role[]) or public.is_platform_admin());

create policy account_invitations_delete_owner on public.account_invitations
  for delete to authenticated
  using (public.has_account_role(account_id, array['owner']::public.user_role[]) or public.is_platform_admin());

-- =========================================================================
-- webinars
-- =========================================================================
create policy webinars_select_members on public.webinars
  for select to authenticated
  using (public.is_account_member(account_id) or public.is_platform_admin());

create policy webinars_select_public on public.webinars
  for select to anon, authenticated
  using (status = 'published');

create policy webinars_insert_editor on public.webinars
  for insert to authenticated
  with check (public.has_account_role(account_id, array['owner', 'editor']::public.user_role[]) or public.is_platform_admin());

create policy webinars_update_editor on public.webinars
  for update to authenticated
  using (public.has_account_role(account_id, array['owner', 'editor']::public.user_role[]) or public.is_platform_admin())
  with check (public.has_account_role(account_id, array['owner', 'editor']::public.user_role[]) or public.is_platform_admin());

create policy webinars_delete_owner on public.webinars
  for delete to authenticated
  using (public.has_account_role(account_id, array['owner']::public.user_role[]) or public.is_platform_admin());

-- =========================================================================
-- webinar_schedules / waiting_room_config / webinar_sessions / chat_messages / ctas
-- Same shape: public can read when the parent webinar is published, hosts
-- can read when they belong to the account (any role, for Viewer access),
-- and only Owner/Editor can write.
-- =========================================================================
create policy webinar_schedules_select on public.webinar_schedules
  for select to anon, authenticated
  using (public.can_view_webinar(webinar_id));
create policy webinar_schedules_manage on public.webinar_schedules
  for all to authenticated
  using (public.can_manage_webinar(webinar_id))
  with check (public.can_manage_webinar(webinar_id));

create policy waiting_room_config_select on public.waiting_room_config
  for select to anon, authenticated
  using (public.can_view_webinar(webinar_id));
create policy waiting_room_config_manage on public.waiting_room_config
  for all to authenticated
  using (public.can_manage_webinar(webinar_id))
  with check (public.can_manage_webinar(webinar_id));

create policy webinar_sessions_select on public.webinar_sessions
  for select to anon, authenticated
  using (public.can_view_webinar(webinar_id));
create policy webinar_sessions_manage on public.webinar_sessions
  for all to authenticated
  using (public.can_manage_webinar(webinar_id))
  with check (public.can_manage_webinar(webinar_id));

create policy chat_messages_select on public.chat_messages
  for select to anon, authenticated
  using (public.can_view_webinar(webinar_id));
create policy chat_messages_manage on public.chat_messages
  for all to authenticated
  using (public.can_manage_webinar(webinar_id))
  with check (public.can_manage_webinar(webinar_id));

create policy ctas_select on public.ctas
  for select to anon, authenticated
  using (public.can_view_webinar(webinar_id));
create policy ctas_manage on public.ctas
  for all to authenticated
  using (public.can_manage_webinar(webinar_id))
  with check (public.can_manage_webinar(webinar_id));

-- =========================================================================
-- registrants: attendee PII, never publicly readable.
-- Public registration is a direct anon INSERT (guarded by
-- enforce_attendee_limit(), which also enforces the plan cap); everything
-- else is host-only.
-- =========================================================================
create policy registrants_select_members on public.registrants
  for select to authenticated
  using (public.is_account_member((select account_id from public.webinars w where w.id = webinar_id)) or public.is_platform_admin());

create policy registrants_insert_public on public.registrants
  for insert to anon, authenticated
  with check (exists (select 1 from public.webinars w where w.id = webinar_id and w.status = 'published'));

create policy registrants_update_manage on public.registrants
  for update to authenticated
  using (public.can_manage_webinar(webinar_id))
  with check (public.can_manage_webinar(webinar_id));

create policy registrants_delete_manage on public.registrants
  for delete to authenticated
  using (public.can_manage_webinar(webinar_id));

-- =========================================================================
-- registrant_messages: inserted only via post_registrant_message() (token
-- auth, SECURITY DEFINER); hosts read/mark-replied.
-- =========================================================================
create policy registrant_messages_select on public.registrant_messages
  for select to authenticated
  using (public.is_account_member((select account_id from public.webinars w where w.id = webinar_id)) or public.is_platform_admin());

create policy registrant_messages_update_manage on public.registrant_messages
  for update to authenticated
  using (public.can_manage_webinar(webinar_id))
  with check (public.can_manage_webinar(webinar_id));

-- =========================================================================
-- viewer_events: inserted only via record_viewer_event() (token auth,
-- SECURITY DEFINER); readable by any account member for analytics.
-- =========================================================================
create policy viewer_events_select on public.viewer_events
  for select to authenticated
  using (public.is_account_member((select account_id from public.webinars w where w.id = webinar_id)) or public.is_platform_admin());

-- =========================================================================
-- email_templates
-- =========================================================================
create policy email_templates_select on public.email_templates
  for select to authenticated
  using (public.is_account_member(account_id) or public.is_platform_admin());

create policy email_templates_manage on public.email_templates
  for all to authenticated
  using (public.has_account_role(account_id, array['owner', 'editor']::public.user_role[]) or public.is_platform_admin())
  with check (public.has_account_role(account_id, array['owner', 'editor']::public.user_role[]) or public.is_platform_admin());

-- =========================================================================
-- enterprise_leads: public contact form, admin-only visibility
-- =========================================================================
create policy enterprise_leads_insert_public on public.enterprise_leads
  for insert to anon, authenticated
  with check (true);

create policy enterprise_leads_select_admin on public.enterprise_leads
  for select to authenticated
  using (public.is_platform_admin());

create policy enterprise_leads_update_admin on public.enterprise_leads
  for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- =========================================================================
-- webhook_endpoints
-- =========================================================================
create policy webhook_endpoints_select on public.webhook_endpoints
  for select to authenticated
  using (public.is_account_member(account_id) or public.is_platform_admin());

create policy webhook_endpoints_manage on public.webhook_endpoints
  for all to authenticated
  using (public.has_account_role(account_id, array['owner', 'editor']::public.user_role[]) or public.is_platform_admin())
  with check (public.has_account_role(account_id, array['owner', 'editor']::public.user_role[]) or public.is_platform_admin());
