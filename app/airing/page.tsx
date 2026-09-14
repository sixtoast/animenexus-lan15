import { fetchAiringSchedule } from "@/lib/anilist-discover";
import { CalendarExportLinks } from "@/components/CalendarExportLinks";
import {
  AiringScheduleGroups,
  type AiringDayGroup,
  type AiringScheduleItem,
} from "@/components/AiringScheduleGroups";
import "./airing.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Airing · AnimeNexus",
  description: "Episode air dates for the next two months, grouped by day.",
};

/** ~60 days */
const HOURS_AHEAD = 24 * 60;

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

  if (isSameLocalDay(d, now)) return `Today · ${long}`;
  if (isSameLocalDay(d, tomorrow)) return `Tomorrow · ${long}`;
  return long;
}

function groupScheduleByDay(rows: AiringScheduleItem[]): AiringDayGroup[] {
  const sorted = [...rows].sort((a, b) => a.airingAt - b.airingAt);
  const map = new Map<string, AiringScheduleItem[]>();
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
  let schedule: Awaited<ReturnType<typeof fetchAiringSchedule>> = [];
  try {
    schedule = await fetchAiringSchedule(HOURS_AHEAD);
  } catch {
    schedule = [];
  }

  const groups = groupScheduleByDay(
    schedule.map((row) => ({
      airingAt: row.airingAt,
      episode: row.episode,
      media: {
        id: row.media.id,
        title: row.media.title,
        image: row.media.image,
      },
    })),
  );

  const todayKey = dayKey(Math.floor(Date.now() / 1000));
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = dayKey(Math.floor(tomorrow.getTime() / 1000));
  const defaultOpenKeys = groups
    .filter((g) => g.key === todayKey || g.key === tomorrowKey)
    .map((g) => g.key);
  if (defaultOpenKeys.length === 0 && groups[0]) {
    defaultOpenKeys.push(groups[0].key);
  }

  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Live signal</div>
          <h1>
            Currently <span>airing</span>
          </h1>
          <p>
            Episode drops for the next ~2 months, grouped by day. Collapse days
            you are not watching to scan further ahead.
          </p>
          <CalendarExportLinks />
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 48 }}>
        <h2 className="section-title">Upcoming episodes</h2>
        <AiringScheduleGroups
          groups={groups}
          defaultOpenKeys={defaultOpenKeys}
        />
      </section>
    </main>
  );
}
