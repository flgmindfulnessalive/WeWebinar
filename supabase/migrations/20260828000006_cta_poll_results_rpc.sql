-- Token-authenticated poll results, for the live room to show a viewer
-- the live tally right after they vote. Same access_token -> registrant
-- resolution as record_viewer_event/get_registrant_playback_state (the
-- live room has no Supabase auth session, only the registrant's token),
-- and the same one-vote-per-registrant dedup as get_webinar_poll_results
-- (20260828000005) so the numbers a viewer sees match what the host sees
-- in Analytics.
create or replace function public.get_cta_poll_results(
  p_access_token uuid,
  p_cta_id uuid
)
returns table (
  option text,
  votes bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_registrant public.registrants%rowtype;
  v_cta public.ctas%rowtype;
begin
  select * into v_registrant from public.registrants where access_token = p_access_token;
  if not found then
    raise exception 'invalid access token';
  end if;

  select * into v_cta from public.ctas where id = p_cta_id;
  if not found or v_cta.webinar_id <> v_registrant.webinar_id or v_cta.type <> 'poll' then
    raise exception 'invalid poll cta';
  end if;

  return query
    with latest_response as (
      select distinct on (ve.registrant_id)
        ve.metadata ->> 'option' as option
      from public.viewer_events ve
      where ve.webinar_id = v_registrant.webinar_id
        and ve.event_type = 'poll_response'
        and (ve.metadata ->> 'cta_id')::uuid = p_cta_id
      order by ve.registrant_id, ve.occurred_at desc
    )
    select lr.option, count(*) as votes
    from latest_response lr
    group by lr.option;
end;
$$;

grant execute on function public.get_cta_poll_results(uuid, uuid) to anon, authenticated;
