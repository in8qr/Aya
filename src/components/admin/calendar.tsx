"use client";

import { useCallback, useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookingDetailsModal } from "./booking-details-modal";

const TEAM_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#14b8a6", "#0d9488",
];

const MOBILE_BREAKPOINT = 768;

export function AdminCalendar({ teamOnly }: { teamOnly: boolean }) {
  const [events, setEvents] = useState<Array<{ id: string; title: string; start: string; end: string; extendedProps?: Record<string, unknown> }>>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchEvents = useCallback(
    async (arg: DatesSetArg) => {
      const start = arg.startStr;
      const end = arg.endStr;
      const res = await fetch(
        `/api/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&teamOnly=${teamOnly}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const withColors = data
        .filter((e: { extendedProps?: { type?: string } }) => e.extendedProps?.type !== "block")
        .map((e: { id: string; extendedProps?: { assignedTeamId?: string } }) => ({
          ...e,
          backgroundColor: e.extendedProps?.assignedTeamId
            ? TEAM_COLORS[
                Math.abs(
                  e.extendedProps.assignedTeamId.split("").reduce((a: number, b: string) => a + b.charCodeAt(0), 0)
                ) % TEAM_COLORS.length
              ]
            : "#64748b",
        }));
      const blocks = data.filter((e: { extendedProps?: { type?: string } }) => e.extendedProps?.type === "block");
      setEvents([...withColors, ...blocks]);
    },
    [teamOnly]
  );

  const handleEventClick = useCallback((info: EventClickArg) => {
    const id = info.event.extendedProps?.bookingId ?? info.event.id;
    if (id && !info.event.extendedProps?.type) setSelectedBookingId(id);
  }, []);

  return (
    <>
      <div className="calendar-wrap overflow-x-auto -mx-2 sm:mx-0">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={isMobile ? "listWeek" : "dayGridMonth"}
          headerToolbar={
            isMobile
              ? { left: "prev,next", center: "title", right: "" }
              : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" }
          }
          events={events}
          datesSet={fetchEvents}
          eventClick={handleEventClick}
          height="auto"
          contentHeight={isMobile ? 400 : undefined}
          key={isMobile ? "mobile" : "desktop"}
        />
      </div>
      <Dialog open={!!selectedBookingId} onOpenChange={(open) => !open && setSelectedBookingId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Booking details</DialogTitle>
          </DialogHeader>
          {selectedBookingId && (
            <BookingDetailsModal bookingId={selectedBookingId} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
