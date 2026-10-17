/**
 * Generates a Google Calendar "Add Event" URL.
 * Works without any API key — opens google.com/calendar with pre-filled details.
 */
export function buildGoogleCalendarUrl({
  title,
  date,
  startTime,
  endTime,
  description,
  location,
}: {
  title: string
  date: string
  startTime: string
  endTime: string
  description?: string
  location?: string
}): string {
  const fmt = (d: string, t: string) =>
    `${d.replace(/-/g, "")}T${t.replace(":", "")}00`

  const start = fmt(date, startTime)
  const end = fmt(date, endTime)

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    details: description || "Booked via BookforMe",
    ...(location ? { location } : {}),
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generates a downloadable .ics file content string.
 * Works with Google Calendar, Outlook, Apple Calendar.
 */
export function buildICSContent({
  uid,
  title,
  date,
  startTime,
  endTime,
  description,
  organizer,
}: {
  uid: string
  title: string
  date: string
  startTime: string
  endTime: string
  description?: string
  organizer?: string
}): string {
  const fmt = (d: string, t: string) =>
    `${d.replace(/-/g, "")}T${t.replace(":", "")}00`

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BookforMe//Appointments//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}@bookforme.app`,
    `DTSTART:${fmt(date, startTime)}`,
    `DTEND:${fmt(date, endTime)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${(description || "").replace(/\n/g, "\\n")}`,
    organizer ? `ORGANIZER;CN=${organizer}:mailto:noreply@bookforme.app` : "",
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n")
}
