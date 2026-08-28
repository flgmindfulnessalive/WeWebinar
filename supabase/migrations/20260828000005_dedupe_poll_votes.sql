-- get_webinar_poll_results counted every poll_response row as a vote --
-- nothing stopped (or dedupes) a viewer clicking several options, or the
-- same option twice, and each click landed as its own row in
-- viewer_events. Reduce to one vote per registrant per poll (the most
-- recent answer wins, so changing your mind before the window closes is
-- fine), same as a real poll.
create or replace function public.get_webinar_poll_results(p_webinar_id uuid)
returns table (
  cta_id uuid,
  question text,
  option text,
  votes bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with latest_response as (
    select distinct on (ve.registrant_id, (ve.metadata ->> 'cta_id'))
      (ve.metadata ->> 'cta_id')::uuid as cta_id,
      ve.metadata ->> 'option' as option
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.event_type = 'poll_response'
    order by ve.registrant_id, (ve.metadata ->> 'cta_id'), ve.occurred_at desc
  )
  select
    c.id as cta_id,
    c.config ->> 'question' as question,
    lr.option,
    count(*) as votes
  from public.ctas c
  join latest_response lr on lr.cta_id = c.id
  where c.webinar_id = p_webinar_id
    and c.type = 'poll'
  group by c.id, c.config ->> 'question', lr.option
  order by c.id, votes desc;
$$;
