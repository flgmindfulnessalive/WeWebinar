-- Enforces "at most one confirmation / replay-missed template per webinar"
-- (so the dashboard editor can upsert instead of managing row identity
-- itself) and "at most one reminder per offset per webinar" (no duplicate
-- 60-minute reminders from a double-submit). Scoped to webinar_id is not
-- null since account-level defaults (webinar_id null) aren't managed
-- through the UI in this pass.
create unique index email_templates_singleton_idx
  on public.email_templates (webinar_id, type)
  where type in ('registration_confirmation', 'replay_missed') and webinar_id is not null;

create unique index email_templates_reminder_offset_idx
  on public.email_templates (webinar_id, reminder_offset_minutes)
  where type = 'reminder' and webinar_id is not null;
