import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/availability - get teacher's availability
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { email: session.user.email },
    include: { availabilities: true },
  });

  return NextResponse.json(teacher?.availabilities || []);
}

// POST /api/availability - toggle a slot
export async function POST(req: NextRequest) {
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

  const { dayOfWeek, startTime, endTime } = await req.json();

  // Check if slot exists
  const existing = await prisma.availability.findUnique({
    where: {
      teacherId_dayOfWeek_startTime: {
        teacherId: teacher.id,
        dayOfWeek,
        startTime,
      },
    },
  });

  if (existing) {
    // Remove it (toggle off)
    await prisma.availability.delete({ where: { id: existing.id } });
    return NextResponse.json({ action: "removed" });
  } else {
    // Create it (toggle on)
    const slot = await prisma.availability.create({
      data: {
        teacherId: teacher.id,
        dayOfWeek,
        startTime,
        endTime,
      },
    });
    return NextResponse.json({ action: "added", slot });
  }
}
