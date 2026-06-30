"use client";

import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";

type Event = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  event_date: string;
  event_type: string;
  partner: string;
  location: string;
  is_active: boolean;
};

type Props = {
  events: Event[];
};

export default function CalendarView({ events }: Props) {
  const [filterActive, setFilterActive] = useState(true);

  const filteredEvents = useMemo(
    () => (filterActive ? events.filter((e) => e.is_active) : events),
    [events, filterActive]
  );

  const calendarEvents = useMemo(
    () =>
      filteredEvents.map((e) => {
        const start = e.start_date || e.event_date;
        const rawEnd = e.end_date || e.event_date;
        // FullCalendar end date is exclusive — add 1 day
        const end = new Date(rawEnd);
        end.setDate(end.getDate() + 1);
        return {
          id: e.id,
          title: e.name,
          start,
          end: end.toISOString().split('T')[0],
          allDay: true,
          extendedProps: {
            partner: e.partner || "-",
            location: e.location || "-",
            event_type: e.event_type,
          },
        };
      }),
    [filteredEvents]
  );

  const handleEventClick = (info: { event: { id: string } }) => {
    window.location.href = `/events/${info.event.id}`;
  };

  const handleEventDidMount = (info: { event: { title: string; extendedProps: Record<string, string> }; el: HTMLElement }) => {
    const { title, extendedProps } = info.event;
    info.el.title = `${title}\nPartner: ${extendedProps.partner}\nLokasi: ${extendedProps.location}\nTipe: ${extendedProps.event_type}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-zinc-600">Tampilkan:</span>
        <button
          onClick={() => setFilterActive(true)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${filterActive ? 'bg-[#1f3c88] text-white shadow-sm' : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'}`}
        >
          Aktif Saja
        </button>
        <button
          onClick={() => setFilterActive(false)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${!filterActive ? 'bg-[#1f3c88] text-white shadow-sm' : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'}`}
        >
          Semua
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={calendarEvents}
          eventClick={handleEventClick}
          eventDidMount={handleEventDidMount}
          height="auto"
          locale="id"
          firstDay={1}
          buttonText={{
            today: "Hari Ini",
            month: "Bulan",
            week: "Minggu",
            day: "Hari",
          }}
          eventContent={(arg) => (
            <div className="truncate px-1 text-xs font-medium">
              {arg.event.title}
            </div>
          )}
        />
      </div>
    </div>
  );
}
