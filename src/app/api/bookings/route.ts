import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGoogleMeetEvent } from "@/lib/google-calendar";
import { sendBookingNotificationEmail } from "@/lib/email";

// GET /api/bookings - get teacher's bookings
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { email: session.user.email },
  });
  if (!teacher) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  const bookings = await prisma.booking.findMany({
    where: { teacherId: teacher.id },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(bookings);
}

interface BookingInput {
  teacherId: string;
  studentName: string;
  subjectName: string;
  notes: string;
  startTime: string;
  endTime: string;
  date: string;
  displayStart: string;
  displayEnd: string;
}

// POST /api/bookings - student creates bookings
export async function POST(req: NextRequest) {
  const body = await req.json();
  const bookingsInput: BookingInput[] = body.bookings;

  if (!Array.isArray(bookingsInput) || bookingsInput.length === 0) {
    return NextResponse.json(
      { error: "bookings array is required" },
      { status: 400 }
    );
  }

  const teacherId = bookingsInput[0].teacherId;
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
  });

  if (!teacher) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  // Sort by start time to find the merged range
  const sorted = [...bookingsInput].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  const mergedStart = new Date(sorted[0].startTime);
  const mergedEnd = new Date(sorted[sorted.length - 1].endTime);

  // Check for any overlapping confirmed booking in the merged range
  const existing = await prisma.booking.findFirst({
    where: {
      teacherId,
      status: "confirmed",
      startTime: { lt: mergedEnd },
      endTime: { gt: mergedStart },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "One or more selected slots overlap with an existing booking" },
      { status: 409 }
    );
  }

  // Create ONE Google Calendar event for the entire merged time range
  let meetingLink: string | null = null;
  let googleEventId: string | null = null;
  try {
    const result = await createGoogleMeetEvent({
      teacherAccessToken: teacher.googleAccessToken!,
      teacherRefreshToken: teacher.googleRefreshToken!,
      teacherEmail: teacher.email,
      summary: `${sorted[0].subjectName} - ${sorted[0].studentName}`,
      description: `Student: ${sorted[0].studentName}\nSubject: ${sorted[0].subjectName}\nNotes: ${sorted[0].notes || ""}\nSlots: ${sorted[0].displayStart} - ${sorted[sorted.length - 1].displayEnd}`,
      startTime: mergedStart,
      endTime: mergedEnd,
    });
    meetingLink = result.hangoutLink;
    googleEventId = result.eventId;
  } catch (e) {
    console.error("Failed to create Google Meet event:", e);
  }

  // Create ONE booking record for the merged time range
  const booking = await prisma.booking.create({
    data: {
      teacherId,
      studentName: sorted[0].studentName,
      subjectName: sorted[0].subjectName,
      notes: sorted[0].notes || "",
      startTime: mergedStart,
      endTime: mergedEnd,
      meetingLink,
      googleEventId,
    },
  });

  const mergedBooking = {
    ...booking,
    date: sorted[0].date,
    displayStart: sorted[0].displayStart,
    displayEnd: sorted[sorted.length - 1].displayEnd,
  };

  // Send email notification to teacher
  try {
    await sendBookingNotificationEmail({
      teacherEmail: teacher.email,
      teacherName: teacher.name,
      studentName: mergedBooking.studentName,
      subjectName: mergedBooking.subjectName,
      notes: mergedBooking.notes,
      bookings: [{
        date: mergedBooking.date,
        displayStart: mergedBooking.displayStart,
        displayEnd: mergedBooking.displayEnd,
        meetLink: mergedBooking.meetingLink,
      }],
    });
  } catch (e) {
    console.error("Failed to send booking notification email:", e);
  }

  return NextResponse.json({ bookings: [mergedBooking] });
}
