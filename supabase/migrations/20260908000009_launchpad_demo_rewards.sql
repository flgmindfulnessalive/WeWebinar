-- WeWebinars Launchpad Fase 4: la etapa "Demo" (vivir una experiencia
-- evergreen real de punta a punta) y el sistema de recompensas
-- (Playbook + descuento) que se desbloquea al completarla.
--
-- "Demo" no arma una experiencia paralela: apunta a un webinar evergreen
-- real de WeWebinars corriendo con el mismo stack público que usa
-- cualquier cuenta (/w/[accountSlug]/[webinarSlug]) -- ver
-- NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL. No hace falta tabla ni RPC
-- para eso, es solo un link. Lo que sí se persiste es si el usuario
-- confirmó haber vivido la demo (marca la etapa completa) y el estado de
-- cada recompensa.
--
-- El código de descuento en sí NO se guarda en la base -- es un único
-- cupón fijo ya creado en el proveedor de pagos, servido desde una env
-- var server-side (LAUNCHPAD_DISCOUNT_CODE) recién cuando el status acá
-- es 'unlocked'/'redeemed'. Ni el status ni el momento de desbloqueo son
-- aceptables desde el cliente -- se recalculan server-side al completar
-- "demo", mismo criterio que el resto de las etapas.
create type public.launchpad_reward_type as enum ('playbook', 'discount');
create type public.launchpad_reward_status as enum ('locked', 'unlocked', 'redeemed', 'expired');

create table public.launchpad_rewards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.launchpad_projects (id) on delete cascade,
  reward_type public.launchpad_reward_type not null,
  status public.launchpad_reward_status not null default 'locked',
  unlocked_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, reward_type)
);
create index launchpad_rewards_project_id_idx on public.launchpad_rewards (project_id);

create trigger set_updated_at before update on public.launchpad_rewards
  for each row execute function public.set_updated_at();

alter table public.launchpad_rewards enable row level security;

create policy launchpad_rewards_select on public.launchpad_rewards
  for select to authenticated
  using (
    public.is_account_member((select account_id from public.launchpad_projects p where p.id = project_id))
    or public.is_platform_admin()
  );

alter type public.launchpad_event_type add value 'demo_completed';
alter type public.launchpad_event_type add value 'reward_unlocked';
alter type public.launchpad_event_type add value 'playbook_downloaded';
alter type public.launchpad_event_type add value 'discount_revealed';
