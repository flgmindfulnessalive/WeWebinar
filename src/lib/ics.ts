// "Add to calendar" links for the waiting room: a downloadable .ics file
// (Outlook/Apple Calendar) and a Google Calendar deep link — both standard,
// well-documented formats, generated client-side.

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text.replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

export function buildIcsDataUri({
  title,
  description,
  startsAt,
  durationMinutes = 60,
  url,
}: {
  title: string;
  description?: string;
  startsAt: Date;
  durationMinutes?: number;
  url?: string;
}): string {
  const end = new Date(startsAt.getTime() + durationMinutes * 60000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WeWebinar//ES",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startsAt)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    description ? `DESCRIPTION:${escapeIcsText(description)}` : undefined,
    url ? `URL:${url}` : undefined,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => Boolean(l));

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}

export function googleCalendarUrl({
  title,
  startsAt,
  durationMinutes = 60,
  details,
}: {
  title: string;
  startsAt: Date;
  durationMinutes?: number;
  details?: string;
}): string {
  const end = new Date(startsAt.getTime() + durationMinutes * 60000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatIcsDate(startsAt)}/${formatIcsDate(end)}`,
    details: details ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
