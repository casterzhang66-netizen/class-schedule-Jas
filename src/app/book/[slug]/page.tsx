"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Slot {
  startTime: string;
  endTime: string;
  startUTC: string;
  endUTC: string;
}

interface SlotWithDate extends Slot {
  date: string;
  displayDate: string;
}

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const studentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [teacherName, setTeacherName] = useState("");
  const [, setTeacherTz] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<Map<string, SlotWithDate>>(
    new Map()
  );
  const [showForm, setShowForm] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [studentName, setStudentName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const fetchSlots = async (selectedDate: string) => {
    setDate(selectedDate);
    setLoadingSlots(true);
    setError("");

    const res = await fetch(
      `/api/slots?slug=${slug}&date=${selectedDate}&tz=${encodeURIComponent(studentTz)}`
    );
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to load slots");
      setLoadingSlots(false);
      return;
    }

    setTeacherName(data.teacher.name);
    setTeacherId(data.teacher.id);
    setTeacherTz(data.teacher.timezone);
    setSlots(data.slots);
    setLoadingSlots(false);
  };

  // Check if a slot is adjacent to the current selection
  const isAdjacentToSelection = (slot: Slot): boolean => {
    if (selectedSlots.size === 0) return true;
    const selected = Array.from(selectedSlots.values());
    const starts = selected.map((s) => s.startUTC);
    const ends = selected.map((s) => s.endUTC);
    // Slot can extend the block at either end
    return ends.includes(slot.startUTC) || starts.includes(slot.endUTC);
  };

  // Check if removing a slot would break continuity
  const canRemoveSlot = (key: string): boolean => {
    if (selectedSlots.size <= 1) return true;
    const remaining = new Map(selectedSlots);
    remaining.delete(key);
    return isContiguous(Array.from(remaining.values()));
  };

  const isContiguous = (slots: SlotWithDate[]): boolean => {
    if (slots.length <= 1) return true;
    const sorted = [...slots].sort(
      (a, b) => new Date(a.startUTC).getTime() - new Date(b.startUTC).getTime()
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].endUTC !== sorted[i + 1].startUTC) return false;
    }
    return true;
  };

  const toggleSlot = (slot: Slot) => {
    setSelectedSlots((prev) => {
      const next = new Map(prev);
      if (next.has(slot.startUTC)) {
        // Only allow removal if it doesn't break continuity
        if (!canRemoveSlot(slot.startUTC)) return prev;
        next.delete(slot.startUTC);
      } else {
        if (!isAdjacentToSelection(slot)) return prev;
        const displayDate = new Date(date + "T00:00:00").toLocaleDateString(
          undefined,
          { weekday: "short", month: "short", day: "numeric" }
        );
        next.set(slot.startUTC, { ...slot, date, displayDate });
      }
      return next;
    });
  };

  const removeSlot = (key: string) => {
    if (!canRemoveSlot(key)) return;
    setSelectedSlots((prev) => {
      const next = new Map(prev);
      next.delete(key);
      if (next.size === 0) setShowForm(false);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlots.size === 0) return;

    setSubmitting(true);
    setError("");

    const bookings = Array.from(selectedSlots.values()).map((s) => ({
      teacherId,
      studentName,
      subjectName,
      notes: notes || "",
      startTime: s.startUTC,
      endTime: s.endUTC,
      date: s.date,
      displayStart: s.startTime,
      displayEnd: s.endTime,
    }));

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookings }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to book");
      setSubmitting(false);
      return;
    }

    const data = await res.json();
    // Merge consecutive slots into one session entry
    const sorted = [...data.bookings].sort(
      (a: { startTime: string }, b: { startTime: string }) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    const merged = {
      date: sorted[0].date,
      start: sorted[0].displayStart,
      end: sorted[sorted.length - 1].displayEnd,
      meetLink: sorted[0].meetingLink || "",
    };
    const bookingsParam = encodeURIComponent(JSON.stringify([merged]));

    router.push(
      `/book/${slug}/success?subject=${encodeURIComponent(subjectName)}&tz=${encodeURIComponent(studentTz)}&bookings=${bookingsParam}`
    );
  };

  // Minimum date is today
  const today = new Date().toISOString().split("T")[0];

  const selectedArray = Array.from(selectedSlots.entries());

  // Get merged time range for display
  const getMergedRange = () => {
    if (selectedArray.length === 0) return null;
    const sorted = [...selectedArray].sort(
      (a, b) => new Date(a[1].startUTC).getTime() - new Date(b[1].startUTC).getTime()
    );
    return {
      start: sorted[0][1].startTime,
      end: sorted[sorted.length - 1][1].endTime,
      displayDate: sorted[0][1].displayDate,
    };
  };

  const mergedRange = getMergedRange();

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        Book a Session{teacherName ? ` with ${teacherName}` : ""}
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        Times shown in your timezone: {studentTz}
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Select a date</label>
        <input
          type="date"
          min={today}
          value={date}
          onChange={(e) => fetchSlots(e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      {loadingSlots && <p>Loading available slots...</p>}

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {date && !loadingSlots && slots.length === 0 && (
        <p className="text-gray-600">No available slots on this date.</p>
      )}

      {slots.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Available slots — select consecutive slots to book a longer session
          </label>
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => {
              const isSelected = selectedSlots.has(s.startUTC);
              const canSelect = isSelected || isAdjacentToSelection(s);
              return (
                <button
                  key={s.startUTC}
                  onClick={() => toggleSlot(s)}
                  disabled={!canSelect}
                  className={`px-4 py-2 border rounded ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600"
                      : canSelect
                        ? "hover:bg-gray-100"
                        : "opacity-40 cursor-not-allowed"
                  }`}
                >
                  {s.startTime} - {s.endTime}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedArray.length > 0 && mergedRange && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded p-4">
          <h3 className="font-semibold mb-2">
            Selected Session ({selectedArray.length} slot{selectedArray.length > 1 ? "s" : ""})
          </h3>
          <p className="text-sm mb-2">
            {mergedRange.displayDate} — {mergedRange.start} - {mergedRange.end}
          </p>
          <div className="space-y-1">
            {selectedArray
              .sort(([, a], [, b]) => new Date(a.startUTC).getTime() - new Date(b.startUTC).getTime())
              .map(([key, s]) => (
              <div
                key={key}
                className="flex items-center justify-between bg-white rounded px-3 py-1.5 border text-sm"
              >
                <span>
                  {s.startTime} - {s.endTime}
                </span>
                <button
                  onClick={() => removeSlot(key)}
                  disabled={!canRemoveSlot(key)}
                  className={`text-sm ml-4 ${
                    canRemoveSlot(key)
                      ? "text-red-500 hover:text-red-700"
                      : "text-gray-300 cursor-not-allowed"
                  }`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
            >
              Confirm &amp; Continue
            </button>
          )}
        </div>
      )}

      {showForm && selectedSlots.size > 0 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Your Name *
            </label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Subject *
            </label>
            <input
              type="text"
              required
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Notes / Areas to cover (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="border rounded px-3 py-2 w-full"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Booking..." : "Book Session"}
          </button>
        </form>
      )}
    </div>
  );
}
