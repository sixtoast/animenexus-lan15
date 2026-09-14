import Link from "next/link";
import { fetchAiring, fetchAiringSchedule } from "@/lib/anilist-discover";
import { AnimeCard } from "@/components/AnimeCard";
import { CalendarExportLinks } from "@/components/CalendarExportLinks";
import "./airing.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Airing · AnimeNexus",
  description: "Currently releasing and upcoming episode schedule.",
};

type ScheduleRow = {
  airingAt: number;
  episode: number;
  media: { id: number; title: string; image?: string };
};

/** Local calendar day key YYYY-MM-DD */
function dayKey(tsSec: number): string {
  const d = new Date(tsSec * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDayHeading(tsSec: number, now = new Date()): string {
  const d = new Date(tsSec * 1000);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const long = d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (isSameLocalDay(d, now)) return `Today (${long})`;
  if (isSameLocalDay(d, tomorrow)) return `Tomorrow (${long})`;
  return long;
}

function formatTimeOnly(tsSec: number): string {
  try {
    return new Date(tsSec * 1000).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function groupScheduleByDay(rows: ScheduleRow[]): {
  key: string;
  heading: string;
  items: ScheduleRow[];
}[] {
  const sorted = [...rows].sort((a, b) => a.airingAt - b.airingAt);
  const map = new Map<string, ScheduleRow[]>();
  for (const row of sorted) {
    const k = dayKey(row.airingAt);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(row);
  }
  const now = new Date();
  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    heading: formatDayHeading(items[0].airingAt, now),
    items,
  }));
}

export default async function AiringPage() {
  let popular;
  let schedule: Awaited<ReturnType<typeof fetchAiringSchedule>> = [];
  try {
    popular = await fetchAiring(1, 24);
  } catch {
    popular = { data: [], pagination: { total: 0, hasNextPage: false } };
  }
  try {
    schedule = await fetchAiringSchedule(72);
  } catch {
    schedule = [];
  }

  const groups = groupScheduleByDay(schedule.slice(0, 48));

  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Live signal</div>
          <h1>
            Currently <span>airing</span>
          </h1>
          <p>
            Popular releasing titles and the next ~72 hours of episode drops,
            grouped by day.
          </p>
          <CalendarExportLinks />
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 32 }}>
        <h2 className="section-title">Upcoming episodes</h2>
        {groups.length === 0 ? (
          <p className="tools-hint">Schedule quiet or unreachable.</p>
        ) : (
          <div className="airing-day-groups">
            {groups.map((group) => (
              <section key={group.key} className="airing-day-group">
                <h3 className="airing-day-heading">{group.heading}</h3>
                <ul className="airing-schedule">
                  {group.items.map((row) => (
                    <li key={`${row.media.id}-${row.episode}-${row.airingAt}`}>
                      <Link
                        href={`/anime/${row.media.id}`}
                        className="airing-row"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={row.media.image || ""} alt="" />
                        <div className="airing-row-body">
                          <div className="airing-title">{row.media.title}</div>
                          <div className="airing-meta">
                            Ep {row.episode}
                          </div>
                        </div>
                        <time
                          className="airing-time"
                          dateTime={new Date(row.airingAt * 1000).toISOString()}
                        >
                          {formatTimeOnly(row.airingAt)}
                        </time>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      <section className="container" style={{ paddingBottom: 48 }}>
        <h2 className="section-title">Popular releasing</h2>
        {popular.data.length === 0 ? (
          <p className="tools-hint">No airing data.</p>
        ) : (
          <div className="anime-grid">
            {popular.data.map((a) => (
              <AnimeCard key={a.id} anime={a} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
