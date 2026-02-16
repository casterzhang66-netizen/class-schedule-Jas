"use client";

import { useEffect, useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6:00 to 23:00

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => r.json())
      .then((data) => {
        const set = new Set<string>();
        for (const a of data) {
          set.add(`${a.dayOfWeek}-${a.startTime}`);
        }
        setSlots(set);
        setLoading(false);
      });
  }, []);

  const toggle = async (day: number, hour: number) => {
    const startTime = `${hour.toString().padStart(2, "0")}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, "0")}:00`;
    const key = `${day}-${startTime}`;

    // Optimistic update
    setSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

    await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek: day, startTime, endTime }),
    });
  };

  if (loading) return <p>Loading availability...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Availability Settings</h1>
      <p className="text-gray-600 mb-4">
        All slots are open by default. Click to lock/unlock. This repeats every week.
      </p>
      <div className="overflow-x-auto">
        <table className="border-collapse border text-sm">
          <thead>
            <tr>
              <th className="border p-2 bg-gray-50">Time</th>
              {DAYS.map((d) => (
                <th key={d} className="border p-2 bg-gray-50 w-36">
                  {d}
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
                {DAYS.map((_, dayIndex) => {
                  const key = `${dayIndex}-${hour.toString().padStart(2, "0")}:00`;
                  const isLocked = slots.has(key);
                  return (
                    <td
                      key={dayIndex}
                      onClick={() => toggle(dayIndex, hour)}
                      className={`border p-2 text-center cursor-pointer select-none ${
                        isLocked
                          ? "bg-gray-200 hover:bg-gray-300"
                          : "bg-green-100 hover:bg-green-200"
                      }`}
                    >
                      {isLocked ? "🔒" : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
