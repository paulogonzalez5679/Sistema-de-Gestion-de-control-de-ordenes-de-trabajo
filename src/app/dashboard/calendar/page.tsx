import { CalendarWeekView } from "@/components/calendar-week-view";

export default function CalendarPage() {
  return (
    <div className="calendar-page">
      <h1 className="calendar-page__title">Calendario</h1>
      <CalendarWeekView />
    </div>
  );
}
