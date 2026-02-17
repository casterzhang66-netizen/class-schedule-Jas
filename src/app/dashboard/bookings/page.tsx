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

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-text-secondary py-12 justify-center">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-medium">Loading bookings...</span>
      </div>
    );
  }

  const activeBookings = bookings.filter((b) => b.status !== "cancelled");

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-6">All Bookings</h1>

      {activeBookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <div className="mx-auto mb-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="text-text-secondary font-medium mb-1">No bookings yet</p>
          <p className="text-text-tertiary text-sm">When students book sessions, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeBookings.map((b) => {
            const start = new Date(b.startTime);
            const end = new Date(b.endTime);
            return (
              <div
                key={b.id}
                className="bg-white rounded-xl shadow-card p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Date & Time */}
                <div className="sm:w-44 shrink-0">
                  <div className="text-sm font-semibold text-text-primary">
                    {start.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {start.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" - "}
                    {end.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {/* Student & Subject */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-text-primary">{b.studentName}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      b.status === "confirmed"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="text-sm text-text-secondary">{b.subjectName}</div>
                  <div className="text-xs text-text-tertiary">{b.studentEmail}</div>
                  {b.notes && (
                    <div className="text-xs text-text-tertiary mt-1 truncate max-w-md">{b.notes}</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {b.meetingLink && (
                    <a
                      href={b.meetingLink}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                      Meet
                    </a>
                  )}
                  {b.status === "confirmed" && (
                    <button
                      onClick={() => cancelBooking(b.id)}
                      className="px-3 py-1.5 border border-border rounded-lg text-sm text-text-secondary hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
