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

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-text-secondary py-12 justify-center">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-medium">Loading availability...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary mb-1">Availability Settings</h1>
        <p className="text-sm text-text-secondary">
          All slots are open by default. Click to toggle availability. This repeats every week.
        </p>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-6 mb-4 text-sm text-text-secondary">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-50 border border-emerald-200" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-50 border border-red-200" />
          <span>Unavailable</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider bg-surface-secondary border-b border-border">
                  Time
                </th>
                {DAYS.map((d) => (
                  <th key={d} className="p-3 text-center text-xs font-medium text-text-tertiary uppercase tracking-wider bg-surface-secondary border-b border-border w-[calc(100%/8)]">
                    {d}
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
                  {DAYS.map((_, dayIndex) => {
                    const key = `${dayIndex}-${hour.toString().padStart(2, "0")}:00`;
                    const isLocked = slots.has(key);
                    return (
                      <td
                        key={dayIndex}
                        onClick={() => toggle(dayIndex, hour)}
                        className={`p-2 text-center cursor-pointer select-none transition-colors border-l border-border-light ${
                          isLocked
                            ? "bg-red-50 hover:bg-red-100"
                            : "bg-emerald-50 hover:bg-emerald-100"
                        }`}
                      >
                        {isLocked && (
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
