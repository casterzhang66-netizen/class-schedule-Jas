"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Course Schedule</h1>
        <p className="mb-8 text-gray-600">
          1-to-1 Teacher Booking System
        </p>
        <button
          onClick={() => signIn("google")}
          className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
        >
          Sign in with Google (Teacher)
        </button>
      </div>
    </div>
  );
}
