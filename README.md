# Course Schedule App

A booking application where teachers set their weekly availability and students book tutoring sessions. Bookings automatically create Google Calendar events with Meet links and send email notifications.

## Features

- **Teacher Dashboard** — View weekly schedule, manage availability, and track bookings
- **Availability Grid** — Toggle time slots open/locked on a recurring weekly basis (6:00–24:00)
- **Student Booking** — Students visit a shareable link, pick a date, select consecutive slots, and book
- **Google Calendar Integration** — Each booking creates a calendar event with a Google Meet link
- **Auto Cancellation Cleanup** — Cancelling a booking deletes the associated calendar event
- **Email Notifications** — Teachers receive an email via Resend when a new booking is made
- **Timezone Support** — Teacher timezone is auto-detected; students see slots in their own timezone

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Database | PostgreSQL + Prisma 7 |
| Auth | NextAuth with Google OAuth |
| Calendar | Google Calendar API |
| Email | Resend |
| Styling | Tailwind CSS |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google Cloud project with OAuth 2.0 credentials (Calendar API enabled)
- Resend API key (optional — emails are skipped if not set)

### Setup

1. Clone the repo and install dependencies:

   ```bash
   git clone <repo-url>
   cd class-schedule-Jas
   npm install
   ```

2. Create a `.env` file with the following variables:

   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   NEXTAUTH_URL=http://localhost:8888
   NEXTAUTH_SECRET=your-secret-key
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   RESEND_API_KEY=your-resend-api-key
   ```

3. Run database migrations:

   ```bash
   npx prisma migrate dev
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs at [http://localhost:8888](http://localhost:8888).

## How It Works

### For Teachers

1. Sign in with Google on the home page
2. Your timezone is auto-detected from your browser
3. Go to **Availability** to lock off times you're unavailable — all slots are open by default
4. Share your booking link (`/book/your-slug`) with students
5. View and cancel bookings from the **Bookings** page

### For Students

1. Visit the teacher's booking link (no login required)
2. Pick a date and select one or more consecutive time slots
3. Fill in your name, subject, and notes
4. Submit — you'll get a confirmation page with a Google Meet link

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── availability/        # Teacher availability (lock/unlock slots)
│   │   ├── bookings/            # Create bookings, cancel with calendar cleanup
│   │   ├── slots/               # Public endpoint for available slots
│   │   └── teacher/timezone/    # Auto-detect teacher timezone
│   ├── book/[slug]/             # Student booking page + success page
│   └── dashboard/               # Teacher dashboard, availability, bookings
├── lib/
│   ├── auth.ts                  # NextAuth configuration
│   ├── prisma.ts                # Prisma client
│   ├── google-calendar.ts       # Google Calendar event create/delete
│   └── email.ts                 # Resend email notifications
prisma/
└── schema.prisma                # Database models (Teacher, Availability, Booking)
```

## API Documentation

See [API.md](API.md) for full endpoint documentation.
