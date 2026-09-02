-- Customer Health Score: a transparent, weighted-points score per account
-- (0-100), computed on demand from data that's already collected --
-- webinars, registrants -- no new instrumentation needed. Same additive,
-- deterministic-points convention as get_webinar_lead_scores
-- (20260901000001): activation and recent usage matter more than any
-- single signal, and nothing here needs an LLM to compute.
--
-- Points: published at least one webinar (activation) +30, ever had a
-- registrant (used the product for real) +20, had a registrant in the
-- last 30 days (still in active use, not just historical) +25, a host
-- touched/edited any webinar in the last 14 days +15, subscription_status
-- is 'active' (already converted to paying) +10. Max 100, three tiers:
-- riesgo (0-33) / atencion (34-66) / saludable (67-100) -- inverse of
-- lead-scoring's caliente/tibio/frio naming, since here a *high* score
-- means low churn risk.
create function public.get_account_health_scores()
returns table (
  account_id uuid,
  published_webinar boolean,
  ever_had_registrant boolean,
  registrants_last_30_days int,
  active_recently boolean,
  score int,
  tier text
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
    with webinar_stats as (
      select
        account_id,
        bool_or(published_at is not null) as published_webinar,
        max(updated_at) as last_webinar_update
      from public.webinars
      group by account_id
    ),
    registrant_stats as (
      select
        w.account_id,
        count(*) as total_registrants,
        count(*) filter (where r.created_at >= now() - interval '30 days') as recent_registrants
      from public.registrants r
      join public.webinars w on w.id = r.webinar_id
      group by w.account_id
    ),
    scored as (
      select
        a.id as account_id,
        coalesce(ws.published_webinar, false) as published_webinar,
        coalesce(rs.total_registrants, 0) > 0 as ever_had_registrant,
        coalesce(rs.recent_registrants, 0)::int as registrants_last_30_days,
        (ws.last_webinar_update is not null and ws.last_webinar_update >= now() - interval '14 days') as active_recently,
        (
          (case when coalesce(ws.published_webinar, false) then 30 else 0 end) +
          (case when coalesce(rs.total_registrants, 0) > 0 then 20 else 0 end) +
          (case when coalesce(rs.recent_registrants, 0) > 0 then 25 else 0 end) +
          (case when ws.last_webinar_update is not null and ws.last_webinar_update >= now() - interval '14 days' then 15 else 0 end) +
          (case when a.subscription_status = 'active' then 10 else 0 end)
        )::int as score
      from public.accounts a
      left join webinar_stats ws on ws.account_id = a.id
      left join registrant_stats rs on rs.account_id = a.id
    )
    select
      account_id, published_webinar, ever_had_registrant, registrants_last_30_days, active_recently,
      score,
      case when score >= 67 then 'saludable' when score >= 34 then 'atencion' else 'riesgo' end as tier
    from scored;
end;
$$;

grant execute on function public.get_account_health_scores() to authenticated;
