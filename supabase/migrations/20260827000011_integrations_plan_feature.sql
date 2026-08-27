-- Outbound webhooks, the Meta (Facebook) pixel, and the Brevo sync are all
-- Pro/Business/Enterprise features -- Core hosts can't use them. Same
-- defense-in-depth trigger pattern as enforce_ai_chat_plan_feature
-- (20260827000001): a trigger on each gated table, so no code path (app
-- bug, direct SQL, future admin tool) can bypass it. One shared
-- "integrations" flag covers all three, since they were shipped and are
-- priced as a single bundle.
update public.plans
set features = features || '{"integrations": true}'::jsonb
where key in ('pro', 'business', 'enterprise');

create or replace function public.enforce_integrations_plan_feature_webhooks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  select coalesce((p.features->>'integrations')::boolean, false) into v_allowed
  from public.accounts a
  join public.plans p on p.id = a.plan_id
  where a.id = new.account_id;

  if not coalesce(v_allowed, false) then
    raise exception 'plan_feature_blocked: integrations not included in this account''s plan';
  end if;

  return new;
end;
$$;

create trigger webhook_endpoints_enforce_integrations_plan_feature
  before insert on public.webhook_endpoints
  for each row execute function public.enforce_integrations_plan_feature_webhooks();

create or replace function public.enforce_integrations_plan_feature_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  if new.brevo_api_key is not null
     and (tg_op = 'INSERT' or old.brevo_api_key is distinct from new.brevo_api_key) then
    select coalesce((p.features->>'integrations')::boolean, false) into v_allowed
    from public.plans p
    where p.id = new.plan_id;

    if not coalesce(v_allowed, false) then
      raise exception 'plan_feature_blocked: integrations not included in this account''s plan';
    end if;
  end if;

  return new;
end;
$$;

create trigger accounts_enforce_integrations_plan_feature
  before insert or update on public.accounts
  for each row execute function public.enforce_integrations_plan_feature_account();

create or replace function public.enforce_integrations_plan_feature_webinars()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  if (new.facebook_pixel_id is not null or new.brevo_list_id is not null)
     and (tg_op = 'INSERT'
       or old.facebook_pixel_id is distinct from new.facebook_pixel_id
       or old.brevo_list_id is distinct from new.brevo_list_id) then
    select coalesce((p.features->>'integrations')::boolean, false) into v_allowed
    from public.accounts a
    join public.plans p on p.id = a.plan_id
    where a.id = new.account_id;

    if not coalesce(v_allowed, false) then
      raise exception 'plan_feature_blocked: integrations not included in this account''s plan';
    end if;
  end if;

  return new;
end;
$$;

create trigger webinars_enforce_integrations_plan_feature
  before insert or update on public.webinars
  for each row execute function public.enforce_integrations_plan_feature_webinars();
