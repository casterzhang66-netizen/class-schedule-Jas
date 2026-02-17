"use client";

import { useSearchParams } from "next/navigation";

interface BookingInfo {
  date: string;
  start: string;
  end: string;
  meetLink: string;
}

export default function SuccessPage() {
  const searchParams = useSearchParams();

  const subject = searchParams.get("subject") || "";
  const bookingsRaw = searchParams.get("bookings");

  let bookings: BookingInfo[] = [];
  if (bookingsRaw) {
    try {
      bookings = JSON.parse(bookingsRaw);
    } catch {
      bookings = [];
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-secondary">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-card p-8 text-center">
          {/* Success checkmark */}
          <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-text-primary mb-2">
            Booking{bookings.length > 1 ? "s" : ""} Confirmed
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            Your session has been scheduled successfully.
          </p>

          {bookings.length > 0 ? (
            <div className="space-y-4 mb-6 text-left">
              {bookings.map((b, i) => (
                <div
                  key={i}
                  className="bg-surface-secondary rounded-xl p-4 space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className="text-sm text-text-primary font-medium">{b.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="text-sm text-text-primary">{b.start} - {b.end}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                    </svg>
                    <span className="text-sm text-text-primary">{subject}</span>
                  </div>
                  {b.meetLink && (
                    <div className="pt-1">
                      <a
                        href={b.meetLink}
                        target="_blank"
                        className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="23 7 16 12 23 17 23 7" />
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                        Join Google Meet
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-tertiary mb-6 text-sm">No booking details available.</p>
          )}

          <p className="text-text-tertiary text-xs">
            You will also receive the meeting details from the teacher.
          </p>
        </div>
      </div>
    </div>
  );
}
