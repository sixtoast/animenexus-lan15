"use client";

type Props = {
  /** Base path without query, default airing feed */
  href?: string;
};

export function CalendarExportLinks({ href = "/api/calendar/airing.ics" }: Props) {
  return (
    <div
      className="detail-actions"
      style={{ flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 8 }}
    >
      <a
        href={`${href}?hours=72`}
        className="btn btn-outline btn-sm"
        download="animenexus-airing-72h.ics"
      >
        Download ICS (72h)
      </a>
      <a
        href={`${href}?hours=168`}
        className="btn btn-outline btn-sm"
        download="animenexus-airing-7d.ics"
      >
        Download ICS (7d)
      </a>
      <p className="tools-hint" style={{ width: "100%", margin: 0 }}>
        Import into Google Calendar, Apple Calendar, or Outlook. Times are
        stored as UTC; your app shows local time. Source: AniList airing
        schedule.
      </p>
    </div>
  );
}
