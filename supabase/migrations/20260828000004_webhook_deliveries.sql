-- dispatchWebhookEvent() only ever caught network-level errors (a fetch()
-- that throws) -- an endpoint responding 404/500 was silently treated as
-- delivered, and there was nowhere for a host to see delivery history at
-- all. This table gives every attempt (fan-out or manual test) a record
-- a host can actually see in Configuración -> Integraciones.
create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.webhook_endpoints (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  event_type text not null,
  status_code int,
  succeeded boolean not null,
  error_message text,
  created_at timestamptz not null default now()
);
create index webhook_deliveries_endpoint_id_idx
  on public.webhook_deliveries (endpoint_id, created_at desc);

alter table public.webhook_deliveries enable row level security;

-- Written server-side via the admin client (dispatchWebhookEvent runs from
-- background contexts -- a registration, a CTA click -- with no
-- authenticated dashboard user in scope), so no insert policy is needed;
-- only the dashboard's read of delivery history goes through RLS.
create policy webhook_deliveries_select on public.webhook_deliveries
  for select to authenticated
  using (public.is_account_member(account_id) or public.is_platform_admin());
