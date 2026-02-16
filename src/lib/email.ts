import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface BookingDetail {
  date: string;
  displayStart: string;
  displayEnd: string;
  meetLink: string | null;
}

interface SendBookingNotificationParams {
  teacherEmail: string;
  teacherName: string;
  studentName: string;
  subjectName: string;
  notes: string;
  bookings: BookingDetail[];
}

export async function sendBookingNotificationEmail(
  params: SendBookingNotificationParams
) {
  const client = getResend();
  if (!client) {
    console.warn("RESEND_API_KEY not set — skipping email notification");
    return;
  }

  const sessionsHtml = params.bookings
    .map(
      (b) => `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px;">
        <p><strong>Date:</strong> ${b.date}</p>
        <p><strong>Time:</strong> ${b.displayStart} - ${b.displayEnd}</p>
        ${b.meetLink ? `<p><strong>Meet:</strong> <a href="${b.meetLink}">${b.meetLink}</a></p>` : ""}
      </div>`
    )
    .join("");

  await client.emails.send({
    from: "Course Schedule <onboarding@resend.dev>",
    to: params.teacherEmail,
    subject: `New booking from ${params.studentName} — ${params.subjectName}`,
    html: `
      <h2>New Booking${params.bookings.length > 1 ? "s" : ""}</h2>
      <p><strong>Student:</strong> ${params.studentName}</p>
      <p><strong>Subject:</strong> ${params.subjectName}</p>
      ${params.notes ? `<p><strong>Notes:</strong> ${params.notes}</p>` : ""}
      <h3>${params.bookings.length} Session${params.bookings.length > 1 ? "s" : ""}</h3>
      ${sessionsHtml}
    `,
  });
}
