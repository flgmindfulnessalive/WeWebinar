-- WeWebinars Partner Engine -- Slice 3: campaigns y tasks. Ver
-- docs/partner-engine/ARCHITECTURE.md §C/§H.

create type public.partner_campaign_status as enum ('active', 'paused', 'completed');

create table public.partner_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pipeline public.partner_pipeline not null,
  icp jsonb not null default '{}'::jsonb,
  message_strategy text,
  offer text,
  owner_id uuid references public.growth_operators (user_id) on delete set null,
  status public.partner_campaign_status not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.partner_campaigns enable row level security;

create policy partner_campaigns_select on public.partner_campaigns
  for select to authenticated
  using (public.is_growth_operator());

create policy partner_campaigns_insert on public.partner_campaigns
  for insert to authenticated
  with check (public.can_edit_partner_engine());

create policy partner_campaigns_update on public.partner_campaigns
  for update to authenticated
  using (public.can_edit_partner_engine());

create table public.partner_campaign_prospects (
  campaign_id uuid not null references public.partner_campaigns (id) on delete cascade,
  prospect_id uuid not null references public.partner_prospects (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (campaign_id, prospect_id)
);
create index partner_campaign_prospects_prospect_idx on public.partner_campaign_prospects (prospect_id);

alter table public.partner_campaign_prospects enable row level security;

create policy partner_campaign_prospects_select on public.partner_campaign_prospects
  for select to authenticated
  using (public.is_growth_operator());

create policy partner_campaign_prospects_insert on public.partner_campaign_prospects
  for insert to authenticated
  with check (public.can_edit_partner_engine());

create policy partner_campaign_prospects_delete on public.partner_campaign_prospects
  for delete to authenticated
  using (public.can_edit_partner_engine());

create type public.partner_task_status as enum ('open', 'done', 'cancelled');

create table public.partner_tasks (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.partner_prospects (id) on delete cascade,
  owner_id uuid references public.growth_operators (user_id) on delete set null,
  title text not null,
  description text,
  due_date date,
  priority smallint not null default 0,
  status public.partner_task_status not null default 'open',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index partner_tasks_owner_status_idx on public.partner_tasks (owner_id, status);
create index partner_tasks_prospect_idx on public.partner_tasks (prospect_id);

alter table public.partner_tasks enable row level security;

create policy partner_tasks_select on public.partner_tasks
  for select to authenticated
  using (public.is_growth_operator());

create policy partner_tasks_insert on public.partner_tasks
  for insert to authenticated
  with check (public.can_edit_partner_engine());

create policy partner_tasks_update on public.partner_tasks
  for update to authenticated
  using (public.can_edit_partner_engine());

-- "task_created"/"task_completed" ya existen en partner_activity_type
-- desde Slice 1 -- no hace falta tocar ese enum.
