import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/teacher/timezone - update teacher's timezone from browser
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { timezone } = await req.json();

  await prisma.teacher.update({
    where: { email: session.user.email },
    data: { timezone },
  });

  return NextResponse.json({ ok: true });
}
