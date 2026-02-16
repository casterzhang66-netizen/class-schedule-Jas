"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
    if (status === "authenticated") {
      // Auto-detect and save teacher's timezone
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      fetch("/api/teacher/timezone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: tz }),
      });
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen">
      <nav className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex gap-6 items-center">
          <span className="font-bold">Course Schedule</span>
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <Link href="/dashboard/availability" className="hover:underline">
            Availability
          </Link>
          <Link href="/dashboard/bookings" className="hover:underline">
            Bookings
          </Link>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-sm text-gray-600">{session.user?.name}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-red-600 hover:underline"
          >
            Sign out
          </button>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
