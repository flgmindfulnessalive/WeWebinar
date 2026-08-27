-- Brevo (email marketing) integration: one API key per account (Settings
-- -> Integraciones), one target list per webinar (wizard -> Marketing) --
-- different webinars are usually different lead magnets that should land
-- in different lists with different nurture automations already set up in
-- Brevo, so the list choice is per-webinar even though the credential
-- isn't.
alter table public.accounts
  add column brevo_api_key text;

alter table public.webinars
  add column brevo_list_id integer;
