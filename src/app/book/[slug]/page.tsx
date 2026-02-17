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
    <div className="min-h-screen bg-surface-secondary py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-card p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-text-primary mb-1">
            Book a Session{teacherName ? ` with ${teacherName}` : ""}
          </h1>
          <p className="text-sm text-text-tertiary mb-6">
            Times shown in your timezone: {studentTz}
          </p>

          {/* Date picker */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">Select a date</label>
            <input
              type="date"
              min={today}
              value={date}
              onChange={(e) => fetchSlots(e.target.value)}
              className="w-full sm:w-auto"
            />
          </div>

          {/* Loading */}
          {loadingSlots && (
            <div className="flex items-center gap-3 text-text-secondary py-6">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Loading available slots...</span>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* No slots */}
          {date && !loadingSlots && slots.length === 0 && !error && (
            <p className="text-text-secondary text-sm py-4">No available slots on this date.</p>
          )}

          {/* Slot buttons */}
          {slots.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-primary mb-3">
                Available slots
              </label>
              <p className="text-xs text-text-tertiary mb-3">
                Select consecutive slots to book a longer session
              </p>
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => {
                  const isSelected = selectedSlots.has(s.startUTC);
                  const canSelect = isSelected || isAdjacentToSelection(s);
                  return (
                    <button
                      key={s.startUTC}
                      onClick={() => toggleSlot(s)}
                      disabled={!canSelect}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                        isSelected
                          ? "bg-brand-500 text-white shadow-sm"
                          : canSelect
                            ? "bg-white border border-border text-text-primary hover:border-brand-300 hover:bg-brand-50"
                            : "bg-surface-tertiary border border-border-light text-text-tertiary opacity-40 cursor-not-allowed"
                      }`}
                    >
                      {s.startTime} - {s.endTime}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected session summary */}
          {selectedArray.length > 0 && mergedRange && (
            <div className="mb-6 bg-brand-50 rounded-xl p-4 border border-brand-100">
              <h3 className="font-medium text-text-primary text-sm mb-2">
                Selected Session ({selectedArray.length} slot{selectedArray.length > 1 ? "s" : ""})
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                {mergedRange.displayDate} — {mergedRange.start} - {mergedRange.end}
              </p>
              <div className="space-y-1.5">
                {selectedArray
                  .sort(([, a], [, b]) => new Date(a.startUTC).getTime() - new Date(b.startUTC).getTime())
                  .map(([key, s]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="text-text-primary">
                      {s.startTime} - {s.endTime}
                    </span>
                    <button
                      onClick={() => removeSlot(key)}
                      disabled={!canRemoveSlot(key)}
                      className={`text-sm ml-4 ${
                        canRemoveSlot(key)
                          ? "text-text-tertiary hover:text-red-500"
                          : "text-border cursor-not-allowed"
                      }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-3 w-full bg-brand-500 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-600 transition-colors text-sm"
                >
                  Continue to Details
                </button>
              )}
            </div>
          )}

          {/* Booking form */}
          {showForm && selectedSlots.size > 0 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="h-px bg-border mb-2" />
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full"
                  placeholder="e.g. Math, English, Science"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Notes <span className="text-text-tertiary font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full"
                  placeholder="Areas to cover, questions, etc."
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
              >
                {submitting && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {submitting ? "Booking..." : "Book Session"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
