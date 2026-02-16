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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">
          Week of {formatDate(weekStart)} - {formatDate(weekEnd)}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={prevWeek}
            className="px-3 py-1 border rounded hover:bg-gray-100"
          >
            ← Prev
          </button>
          <button
            onClick={nextWeek}
            className="px-3 py-1 border rounded hover:bg-gray-100"
          >
            Next →
          </button>
        </div>
      </div>

      {slug && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-gray-600">Booking link:</span>
          <code className="bg-gray-100 px-2 py-1 rounded">{bookingLink}</code>
          <button
            onClick={copyLink}
            className="px-2 py-1 border rounded hover:bg-gray-100"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="border-collapse border text-sm">
          <thead>
            <tr>
              <th className="border p-2 bg-gray-50">Time</th>
              {weekDates.map((d, i) => (
                <th key={i} className="border p-2 bg-gray-50 w-36">
                  {DAYS[i]} {d.getDate()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour}>
                <td className="border p-2 text-right whitespace-nowrap bg-gray-50">
                  {hour.toString().padStart(2, "0")}:00-
                  {(hour + 1).toString().padStart(2, "0")}:00
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
                        className="border p-2 text-center bg-blue-100 cursor-pointer hover:bg-blue-200"
                      >
                        <div className="font-medium text-xs">
                          {booking.studentName}
                        </div>
                        <div className="text-xs text-gray-600">
                          {booking.subjectName}
                        </div>
                      </td>
                    );
                  }

                  if (isLocked) {
                    return (
                      <td
                        key={dayIndex}
                        className="border p-2 text-center bg-gray-200 text-gray-400"
                      >
                        🔒
                      </td>
                    );
                  }

                  return (
                    <td
                      key={dayIndex}
                      className="border p-2 text-center bg-green-50 text-gray-400 text-xs"
                    >
                      (open)
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 max-w-md w-full">
            <h2 className="text-lg font-bold mb-4">Booking Details</h2>
            <p>
              <strong>Student:</strong> {selectedBooking.studentName}
            </p>
            <p>
              <strong>Email:</strong> {selectedBooking.studentEmail}
            </p>
            <p>
              <strong>Subject:</strong> {selectedBooking.subjectName}
            </p>
            <p>
              <strong>Notes:</strong> {selectedBooking.notes}
            </p>
            <p>
              <strong>Time:</strong>{" "}
              {new Date(selectedBooking.startTime).toLocaleString()} -{" "}
              {new Date(selectedBooking.endTime).toLocaleTimeString()}
            </p>
            {selectedBooking.meetingLink && (
              <p>
                <strong>Meet:</strong>{" "}
                <a
                  href={selectedBooking.meetingLink}
                  target="_blank"
                  className="text-blue-600 underline"
                >
                  {selectedBooking.meetingLink}
                </a>
              </p>
            )}
            <button
              onClick={() => setSelectedBooking(null)}
              className="mt-4 px-4 py-2 border rounded hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
