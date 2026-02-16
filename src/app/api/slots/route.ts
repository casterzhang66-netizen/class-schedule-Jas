import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// All bookable hours (6:00 to 21:00)
const ALL_HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

// Helper: get a Date object for a specific date+time in a specific timezone
function dateInTimezone(dateStr: string, timeStr: string, timezone: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  const tempDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const utcStr = tempDate.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = tempDate.toLocaleString("en-US", { timeZone: timezone });

  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  const offset = utcDate.getTime() - tzDate.getTime();

  return new Date(tempDate.getTime() + offset);
}

// Helper: format a Date to "HH:mm" in a specific timezone
function formatTimeInTz(date: Date, timezone: string): string {
  return date.toLocaleTimeString("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getDayOfWeekInTz(dateStr: string, timezone: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayStr = date.toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "short",
  });
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[dayStr] ?? 0;
}

// GET /api/slots?slug=john-doe&date=2026-02-16&tz=America/Los_Angeles
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const date = req.nextUrl.searchParams.get("date");
  const studentTz = req.nextUrl.searchParams.get("tz") || "UTC";

  if (!slug || !date) {
    return NextResponse.json(
      { error: "slug and date are required" },
      { status: 400 }
    );
  }

  const teacher = await prisma.teacher.findUnique({
    where: { slug },
    include: { availabilities: true },
  });

  if (!teacher) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  const teacherTz = teacher.timezone || "UTC";

  // Build a set of locked slots (availability rows now mean "locked")
  const lockedSet = new Set(
    teacher.availabilities.map((a) => `${a.dayOfWeek}-${a.startTime}`)
  );

  // Get the UTC range for the student's selected date
  const studentDayStartUTC = dateInTimezone(date, "00:00", studentTz);
  const studentDayEndUTC = dateInTimezone(date, "23:59", studentTz);

  // Generate all possible slots from teacher's schedule, excluding locked ones
  const available: { startTime: string; endTime: string; startUTC: string; endUTC: string }[] = [];

  // Check teacher dates that could overlap with the student's selected date
  for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
    const checkDate = new Date(studentDayStartUTC);
    checkDate.setUTCDate(checkDate.getUTCDate() + dayOffset);

    const teacherDateStr = checkDate.toLocaleDateString("en-CA", {
      timeZone: teacherTz,
    });

    const teacherDayOfWeek = getDayOfWeekInTz(teacherDateStr, teacherTz);

    for (const hour of ALL_HOURS) {
      const startTime = `${hour.toString().padStart(2, "0")}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, "0")}:00`;
      const key = `${teacherDayOfWeek}-${startTime}`;

      // Skip if this slot is locked
      if (lockedSet.has(key)) continue;

      // Convert to UTC
      const slotStartUTC = dateInTimezone(teacherDateStr, startTime, teacherTz);
      const slotEndUTC = dateInTimezone(teacherDateStr, endTime, teacherTz);

      // Check if this slot falls within the student's selected date
      if (slotStartUTC >= studentDayStartUTC && slotStartUTC <= studentDayEndUTC) {
        const displayStart = formatTimeInTz(slotStartUTC, studentTz);
        const displayEnd = formatTimeInTz(slotEndUTC, studentTz);

        available.push({
          startTime: displayStart,
          endTime: displayEnd,
          startUTC: slotStartUTC.toISOString(),
          endUTC: slotEndUTC.toISOString(),
        });
      }
    }
  }

  // Get existing bookings that overlap with the student's day
  const bookings = await prisma.booking.findMany({
    where: {
      teacherId: teacher.id,
      status: "confirmed",
      startTime: { lt: studentDayEndUTC },
      endTime: { gt: studentDayStartUTC },
    },
  });

  // Filter out slots that overlap with any existing booking
  const seen = new Set<string>();
  const filtered = available
    .filter((s) => {
      const slotStart = new Date(s.startUTC).getTime();
      const slotEnd = new Date(s.endUTC).getTime();
      const overlaps = bookings.some((b) => {
        return b.startTime.getTime() < slotEnd && b.endTime.getTime() > slotStart;
      });
      if (overlaps) return false;
      if (seen.has(s.startUTC)) return false;
      seen.add(s.startUTC);
      return true;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return NextResponse.json({
    teacher: { id: teacher.id, name: teacher.name, timezone: teacherTz },
    slots: filtered,
  });
}
