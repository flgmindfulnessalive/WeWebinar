-- Lets a "Todos los días" fixed schedule skip Saturday/Sunday occurrences,
-- so an evergreen webinar's suggested times look like a real weekday-only
-- schedule instead of running literally every day of the week. Only
-- meaningful when day_of_week is null (a specific weekday is already a
-- single day, weekend or not).
alter table public.webinar_schedules
  add column exclude_weekends boolean not null default false;

alter table public.webinar_schedules
  add constraint webinar_schedules_exclude_weekends_only_every_day
  check (not exclude_weekends or day_of_week is null);
