-- WeWebinars Partner Engine -- Slice 4: analítica básica (funnel por stage,
-- score promedio). Ver docs/partner-engine/ARCHITECTURE.md §H.
--
-- SECURITY INVOKER on purpose, same pattern as get_platform_metrics(): both
-- partner_prospects and partner_scores already gate SELECT on
-- is_growth_operator(), so a growth operator sees the real aggregate through
-- the normal authenticated client and anyone else gets a clear error instead
-- of a silently-empty result.
create or replace function public.get_growth_analytics()
returns table (
  stage_counts jsonb,
  avg_fit_score numeric,
  avg_opportunity_score numeric,
  analyzed_count bigint,
  total_prospects bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.is_growth_operator() then
    raise exception 'not authorized';
  end if;

  return query
    with latest_scores as (
      select distinct on (prospect_id) prospect_id, fit_score, opportunity_score
      from public.partner_scores
      order by prospect_id, created_at desc
    )
    select
      (
        select coalesce(jsonb_object_agg(s.stage, s.cnt), '{}'::jsonb)
        from (
          select stage, count(*) as cnt
          from public.partner_prospects
          where archived_at is null
          group by stage
        ) s
      ) as stage_counts,
      (select round(avg(fit_score), 1) from latest_scores) as avg_fit_score,
      (select round(avg(opportunity_score), 1) from latest_scores) as avg_opportunity_score,
      (select count(*) from latest_scores) as analyzed_count,
      (select count(*) from public.partner_prospects where archived_at is null) as total_prospects;
end;
$$;

grant execute on function public.get_growth_analytics() to authenticated;
