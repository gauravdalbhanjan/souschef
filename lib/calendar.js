// "Add reminder to calendar": built on the device. Title, time and one safety
// line come from code; never allergy or health details. Nothing is sent by us:
// the Google link opens Google Calendar for the user to confirm, and the .ics
// file is downloaded for Apple Calendar / Outlook.
const pad = (n) => String(n).padStart(2, '0')
const stamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
const clean = (s, max) => String(s || '').replace(/[\r\n]+/g, ' ').slice(0, max)

export function reminder({ title, minutesFromNow, line, now = Date.now() }) {
  const start = new Date(now + Math.max(1, minutesFromNow) * 60000)
  const end = new Date(start.getTime() + 15 * 60000)
  return { title: clean(title, 80), line: clean(line, 160), start, end }
}

export function googleLink(r) {
  const q = new URLSearchParams({ action: 'TEMPLATE', text: r.title, dates: `${stamp(r.start)}/${stamp(r.end)}`, details: r.line })
  return `https://calendar.google.com/calendar/render?${q}`
}

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
export function icsText(r, uid = `${r.start.getTime()}@souschef.local`) {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SousChef//Reminder//EN', 'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(r.start)}`, `DTEND:${stamp(r.end)}`, `SUMMARY:${esc(r.title)}`, `DESCRIPTION:${esc(r.line)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', `DESCRIPTION:${esc(r.title)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
}

export function downloadIcs(r) {
  const blob = new Blob([icsText(r)], { type: 'text/calendar' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'souschef-reminder.ics'
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
