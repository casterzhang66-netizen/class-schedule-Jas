import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteGoogleCalendarEvent } from "@/lib/google-calendar";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { teacher: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Delete Google Calendar event if we have one
  if (
    booking.googleEventId &&
    booking.teacher.googleAccessToken &&
    booking.teacher.googleRefreshToken
  ) {
    try {
      await deleteGoogleCalendarEvent({
        teacherAccessToken: booking.teacher.googleAccessToken,
        teacherRefreshToken: booking.teacher.googleRefreshToken,
        eventId: booking.googleEventId,
      });
    } catch (e) {
      console.error("Failed to delete Google Calendar event:", e);
    }
  }

  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: { status: "cancelled" },
  });

  return NextResponse.json(updated);
}
