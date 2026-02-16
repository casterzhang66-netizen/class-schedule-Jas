"use client";

import { useEffect, useState } from "react";

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

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = () => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => {
        setBookings(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const cancelBooking = async (id: string) => {
    if (!confirm("Cancel this booking?")) return;
    await fetch(`/api/bookings/${id}/cancel`, { method: "POST" });
    fetchBookings();
  };

  if (loading) return <p>Loading bookings...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">All Bookings</h1>
      {bookings.length === 0 ? (
        <p className="text-gray-600">No bookings yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse border text-sm w-full">
            <thead>
              <tr>
                <th className="border p-2 bg-gray-50 text-left">Date</th>
                <th className="border p-2 bg-gray-50 text-left">Time</th>
                <th className="border p-2 bg-gray-50 text-left">Student</th>
                <th className="border p-2 bg-gray-50 text-left">Subject</th>
                <th className="border p-2 bg-gray-50 text-left">Notes</th>
                <th className="border p-2 bg-gray-50 text-left">Meet</th>
                <th className="border p-2 bg-gray-50 text-left">Status</th>
                <th className="border p-2 bg-gray-50 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.filter((b) => b.status !== "cancelled").map((b) => {
                const start = new Date(b.startTime);
                const end = new Date(b.endTime);
                return (
                  <tr
                    key={b.id}
                    className={
                      b.status === "cancelled" ? "opacity-50" : ""
                    }
                  >
                    <td className="border p-2 whitespace-nowrap">
                      {start.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        weekday: "short",
                      })}
                    </td>
                    <td className="border p-2 whitespace-nowrap">
                      {start.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" - "}
                      {end.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="border p-2">
                      <div>{b.studentName}</div>
                      <div className="text-gray-500 text-xs">
                        {b.studentEmail}
                      </div>
                    </td>
                    <td className="border p-2">{b.subjectName}</td>
                    <td className="border p-2 max-w-xs truncate">
                      {b.notes}
                    </td>
                    <td className="border p-2">
                      {b.meetingLink ? (
                        <a
                          href={b.meetingLink}
                          target="_blank"
                          className="text-blue-600 underline"
                        >
                          Join
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="border p-2">{b.status}</td>
                    <td className="border p-2">
                      {b.status === "confirmed" && (
                        <button
                          onClick={() => cancelBooking(b.id)}
                          className="text-red-600 hover:underline text-xs"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
