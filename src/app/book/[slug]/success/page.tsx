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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-4">
          Booking{bookings.length > 1 ? "s" : ""} Confirmed!
        </h1>

        {bookings.length > 0 ? (
          <div className="space-y-4 mb-6">
            {bookings.map((b, i) => (
              <div
                key={i}
                className="text-left bg-gray-50 rounded p-4 space-y-2"
              >
                <p>
                  <strong>Date:</strong> {b.date}
                </p>
                <p>
                  <strong>Time:</strong> {b.start} - {b.end}
                </p>
                <p>
                  <strong>Subject:</strong> {subject}
                </p>
                {b.meetLink && (
                  <div>
                    <p className="font-medium mb-1">Google Meet:</p>
                    <a
                      href={b.meetLink}
                      target="_blank"
                      className="text-blue-600 underline break-all text-sm"
                    >
                      {b.meetLink}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 mb-6">No booking details available.</p>
        )}

        <p className="text-gray-600 text-sm">
          You will also receive the meeting details from the teacher.
        </p>
      </div>
    </div>
  );
}
