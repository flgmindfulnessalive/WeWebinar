insert into public.plans (key, name, price_annual_usd, max_active_webinars, max_users, max_attendees_per_webinar, features, is_self_serve)
values
  ('core', 'Core', 60.00, 1, 1, 100, '{}'::jsonb, true),
  ('pro', 'Pro', 100.00, 5, 3, 333, '{}'::jsonb, true),
  ('business', 'Business', 500.00, 15, 10, 1000, '{"remove_branding": true, "custom_domain": true}'::jsonb, true),
  ('enterprise', 'Enterprise', null, null, null, null, '{"remove_branding": true, "custom_domain": true, "custom": true}'::jsonb, false)
on conflict (key) do nothing;
