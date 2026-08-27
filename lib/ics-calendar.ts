/**
 * ICS calendar export (API Expansion II Sprint 22).
 * RFC 5545-ish minimal VCALENDAR from known air times.
 * Does not invent air times — only emits provided timestamps.
 */

export type IcsEventInput = {
  uid: string;
  title: string;
  /** Unix seconds or ISO string */
  start: number | string;
  /** Duration minutes (default 30) */
  durationMinutes?: number;
  description?: string;
  url?: string;
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** UTC FORM: 20260827T180000Z */
export function toIcsUtc(d: Date): string {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  // Soft max ~75 octets; simple fold for long DESCRIPTION/URL
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

function resolveStart(start: number | string): Date | null {
  if (typeof start === "number") {
    // Heuristic: < 1e12 → seconds
    const ms = start < 1e12 ? start * 1000 : start;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(start);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function buildIcsCalendar(
  events: IcsEventInput[],
  opts?: { calName?: string; productId?: string },
): string {
  const calName = opts?.calName || "AnimeNexus Airing";
  const product = opts?.productId || "-//AnimeNexus//Lantern//EN";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${product}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${escapeText(calName)}`),
  ];

  const now = toIcsUtc(new Date());

  for (const ev of events) {
    const start = resolveStart(ev.start);
    if (!start) continue;
    const dur = Math.max(5, Math.min(240, ev.durationMinutes ?? 30));
    const end = new Date(start.getTime() + dur * 60_000);
    lines.push("BEGIN:VEVENT");
    lines.push(foldLine(`UID:${escapeText(ev.uid)}`));
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${toIcsUtc(start)}`);
    lines.push(`DTEND:${toIcsUtc(end)}`);
    lines.push(foldLine(`SUMMARY:${escapeText(ev.title)}`));
    if (ev.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeText(ev.description)}`));
    }
    if (ev.url) {
      lines.push(foldLine(`URL:${ev.url}`));
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
