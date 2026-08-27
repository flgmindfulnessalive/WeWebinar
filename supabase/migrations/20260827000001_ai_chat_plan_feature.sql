-- The AI chat-reply agent (webinars.ai_chat_enabled) is a Pro/Business/
-- Enterprise feature -- Core hosts can't turn it on. Same enforcement
-- style as enforce_webinar_publish_limit/enforce_attendee_limit
-- (20260822000003): a trigger on the gated table itself, so no code path
-- (app bug, direct SQL, future admin tool) can bypass it.
update public.plans
set features = features || '{"ai_chat_replies": true}'::jsonb
where key in ('pro', 'business', 'enterprise');

create or replace function public.enforce_ai_chat_plan_feature()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  if new.ai_chat_enabled and (tg_op = 'INSERT' or old.ai_chat_enabled is distinct from new.ai_chat_enabled) then
    select coalesce((p.features->>'ai_chat_replies')::boolean, false) into v_allowed
    from public.accounts a
    join public.plans p on p.id = a.plan_id
    where a.id = new.account_id;

    if not coalesce(v_allowed, false) then
      raise exception 'plan_feature_blocked: ai_chat_replies not included in this account''s plan';
    end if;
  end if;

  return new;
end;
$$;

create trigger webinars_enforce_ai_chat_plan_feature
  before insert or update on public.webinars
  for each row execute function public.enforce_ai_chat_plan_feature();
