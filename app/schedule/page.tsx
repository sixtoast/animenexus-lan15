import ScheduleClient from "@/components/ScheduleClient";
import "./schedule.css";

export const metadata = {
  title: "Schedule · AnimeNexus",
  description: "A personalised weekly anime broadcast schedule powered by AnimeSchedule.",
};

export default function SchedulePage() {
  return <ScheduleClient />;
}
