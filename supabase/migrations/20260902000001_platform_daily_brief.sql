-- Daily CEO Brief: a once-a-day snapshot of the platform's core metrics
-- (same values as get_platform_metrics/get_platform_scorecard, computed
-- identically) plus a short AI-written narrative highlighting what moved.
-- Written by a daily cron (see /api/cron/platform-daily-brief), read by the
-- admin overview page.
create table public.platform_metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null unique,
  total_accounts bigint not null,
  active_accounts bigint not null,
  trial_accounts bigint not null,
  mrr_usd numeric not null,
  arr_usd numeric not null,
  active_webinars bigint not null,
  total_attendees bigint not null,
  activation_rate_pct numeric,
  avg_hours_to_first_webinar numeric,
  conversion_actions_generated bigint not null,
  monthly_automated_presentations_delivered bigint not null,
  ai_summary text,
  created_at timestamptz not null default now()
);

alter table public.platform_metrics_snapshots enable row level security;

create policy platform_metrics_snapshots_select_admin
  on public.platform_metrics_snapshots
  for select
  to authenticated
  using (public.is_platform_admin());

-- No insert/update policy -- only the cron (service-role client, which
-- bypasses RLS entirely) ever writes these rows.

-- Computes today's numbers and upserts them, leaving ai_summary untouched
-- so a re-run before the AI narrative step (or a retry) doesn't wipe it.
-- No is_platform_admin() guard and no grant to authenticated: this is a
-- trusted-caller-only function, meant to run from the cron's service-role
-- client -- same trust boundary as guard_account_billing_columns' "auth.uid()
-- is null" service-role case, just without the trigger wrapper.
create function public.snapshot_platform_metrics()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_billed_arr numeric;
begin
  select coalesce(sum(p.price_annual_usd), 0) into v_billed_arr
  from public.accounts a
  join public.plans p on p.id = a.plan_id
  where a.subscription_status = 'active' and p.price_annual_usd is not null;

  insert into public.platform_metrics_snapshots (
    snapshot_date, total_accounts, active_accounts, trial_accounts,
    mrr_usd, arr_usd, active_webinars, total_attendees,
    activation_rate_pct, avg_hours_to_first_webinar,
    conversion_actions_generated, monthly_automated_presentations_delivered
  )
  select
    current_date,
    (select count(*) from public.accounts),
    (select count(*) from public.accounts where subscription_status = 'active'),
    (select count(*) from public.accounts where subscription_status = 'trialing'),
    v_billed_arr / 12,
    v_billed_arr,
    (select count(*) from public.webinars where status = 'published'),
    (select count(*) from public.registrants),
    (
      with first_publish as (
        select account_id, min(published_at) as first_published_at
        from public.webinars
        where published_at is not null
        group by account_id
      )
      select round(100.0 * (select count(*) from first_publish) / nullif((select count(*) from public.accounts), 0), 1)
    ),
    (
      with first_publish as (
        select account_id, min(published_at) as first_published_at
        from public.webinars
        where published_at is not null
        group by account_id
      )
      select round(avg(extract(epoch from (fp.first_published_at - a.created_at)))::numeric / 3600, 1)
      from first_publish fp
      join public.accounts a on a.id = fp.account_id
    ),
    (select count(*) from public.viewer_events where event_type = 'cta_click'),
    (
      select count(distinct ve.registrant_id)
      from public.viewer_events ve
      where ve.video_timestamp_seconds is not null
        and ve.occurred_at >= date_trunc('month', now())
    )
  on conflict (snapshot_date) do update set
    total_accounts = excluded.total_accounts,
    active_accounts = excluded.active_accounts,
    trial_accounts = excluded.trial_accounts,
    mrr_usd = excluded.mrr_usd,
    arr_usd = excluded.arr_usd,
    active_webinars = excluded.active_webinars,
    total_attendees = excluded.total_attendees,
    activation_rate_pct = excluded.activation_rate_pct,
    avg_hours_to_first_webinar = excluded.avg_hours_to_first_webinar,
    conversion_actions_generated = excluded.conversion_actions_generated,
    monthly_automated_presentations_delivered = excluded.monthly_automated_presentations_delivered;
end;
$$;

-- Read side for the admin page: latest snapshot plus the closest one at or
-- before `p_compare_days` ago, so the UI can show deltas without doing its
-- own date-nearest-match logic.
create function public.get_platform_metrics_brief(p_compare_days int default 7)
returns table (
  snapshot_date date,
  total_accounts bigint,
  active_accounts bigint,
  trial_accounts bigint,
  mrr_usd numeric,
  arr_usd numeric,
  active_webinars bigint,
  total_attendees bigint,
  activation_rate_pct numeric,
  conversion_actions_generated bigint,
  ai_summary text,
  compare_snapshot_date date,
  compare_total_accounts bigint,
  compare_active_accounts bigint,
  compare_mrr_usd numeric,
  compare_activation_rate_pct numeric
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  return query
    with latest as (
      select * from public.platform_metrics_snapshots
      order by snapshot_date desc
      limit 1
    ),
    compare as (
      select *
      from public.platform_metrics_snapshots
      where snapshot_date <= (select snapshot_date from latest) - p_compare_days
      order by snapshot_date desc
      limit 1
    )
    select
      latest.snapshot_date, latest.total_accounts, latest.active_accounts, latest.trial_accounts,
      latest.mrr_usd, latest.arr_usd, latest.active_webinars, latest.total_attendees,
      latest.activation_rate_pct, latest.conversion_actions_generated, latest.ai_summary,
      compare.snapshot_date, compare.total_accounts, compare.active_accounts,
      compare.mrr_usd, compare.activation_rate_pct
    from latest
    left join compare on true;
end;
$$;

grant execute on function public.get_platform_metrics_brief(int) to authenticated;
