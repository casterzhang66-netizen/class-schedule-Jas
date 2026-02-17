"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Booking {
  id: string;
  studentName: string;
  studentEmail: string;
  subjectName: string;
  notes: string;
  startTime: string;
  endTime: string;
  meetingLink: string | null;
  status: string;
}

interface Availability {
  dayOfWeek: number;
  startTime: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [copied, setCopied] = useState(false);

  const slug = ((session as unknown) as Record<string, unknown>)?.slug as string || "";

  useEffect(() => {
    fetch("/api/bookings").then((r) => r.json()).then(setBookings);
    fetch("/api/availability").then((r) => r.json()).then(setAvailability);
  }, []);

  const weekDates = DAYS.map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const availSet = new Set(
    availability.map((a) => `${a.dayOfWeek}-${a.startTime}`)
  );

  const getBooking = (dayIndex: number, hour: number) => {
    const date = weekDates[dayIndex];
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);
    return bookings.find((b) => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return (
        bStart.getTime() < slotEnd.getTime() &&
        bEnd.getTime() > slotStart.getTime() &&
        b.status === "confirmed"
      );
    });
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const bookingLink = `http://localhost:8888/book/${slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(bookingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Booking link card */}
      {slug && (
        <div className="bg-white rounded-xl shadow-card p-4 mb-6 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
            <span>Your booking link:</span>
          </div>
          <code className="bg-surface-tertiary text-text-primary px-3 py-1.5 rounded-lg text-sm font-mono">
            {bookingLink}
          </code>
          <button
            onClick={copyLink}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-text-primary">
          {formatDate(weekStart)} - {formatDate(weekEnd)}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={prevWeek}
            className="p-2 rounded-lg border border-border hover:bg-surface-tertiary transition-colors"
            aria-label="Previous week"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={nextWeek}
            className="p-2 rounded-lg border border-border hover:bg-surface-tertiary transition-colors"
            aria-label="Next week"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider bg-surface-secondary border-b border-border">
                  Time
                </th>
                {weekDates.map((d, i) => (
                  <th key={i} className="p-3 text-center text-xs font-medium text-text-tertiary uppercase tracking-wider bg-surface-secondary border-b border-border w-[calc(100%/8)]">
                    {DAYS[i]} {d.getDate()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour} className="border-b border-border-light last:border-b-0">
                  <td className="p-3 text-right whitespace-nowrap text-xs text-text-tertiary font-medium bg-surface-secondary/50">
                    {hour.toString().padStart(2, "0")}:00
                  </td>
                  {weekDates.map((_, dayIndex) => {
                    const timeKey = `${hour.toString().padStart(2, "0")}:00`;
                    const isLocked = availSet.has(`${dayIndex}-${timeKey}`);
                    const booking = getBooking(dayIndex, hour);

                    if (booking) {
                      return (
                        <td
                          key={dayIndex}
                          onClick={() => setSelectedBooking(booking)}
                          className="p-2 text-center bg-brand-50 cursor-pointer hover:bg-brand-100 transition-colors border-l border-border-light"
                        >
                          <div className="font-medium text-xs text-brand-700">
                            {booking.studentName}
                          </div>
                          <div className="text-xs text-brand-500">
                            {booking.subjectName}
                          </div>
                        </td>
                      );
                    }

                    if (isLocked) {
                      return (
                        <td
                          key={dayIndex}
                          className="p-2 text-center bg-red-50 border-l border-border-light"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400 mx-auto" />
                        </td>
                      );
                    }

                    return (
                      <td
                        key={dayIndex}
                        className="p-2 text-center border-l border-border-light"
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking detail modal */}
      {selectedBooking && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-modal p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Booking Details</h2>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1 rounded-lg hover:bg-surface-tertiary transition-colors"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="text-sm text-text-secondary w-16 shrink-0">Student</span>
                <span className="text-sm text-text-primary font-medium">{selectedBooking.studentName}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-sm text-text-secondary w-16 shrink-0">Email</span>
                <span className="text-sm text-text-primary">{selectedBooking.studentEmail}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-sm text-text-secondary w-16 shrink-0">Subject</span>
                <span className="text-sm text-text-primary">{selectedBooking.subjectName}</span>
              </div>
              {selectedBooking.notes && (
                <div className="flex gap-3">
                  <span className="text-sm text-text-secondary w-16 shrink-0">Notes</span>
                  <span className="text-sm text-text-primary">{selectedBooking.notes}</span>
                </div>
              )}
              <div className="flex gap-3">
                <span className="text-sm text-text-secondary w-16 shrink-0">Time</span>
                <span className="text-sm text-text-primary">
                  {new Date(selectedBooking.startTime).toLocaleString()} -{" "}
                  {new Date(selectedBooking.endTime).toLocaleTimeString()}
                </span>
              </div>
              {selectedBooking.meetingLink && (
                <div className="pt-2">
                  <a
                    href={selectedBooking.meetingLink}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                    </svg>
                    Join Google Meet
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
