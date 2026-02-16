# Course Schedule App

## Project Overview
A Next.js booking app where teachers set availability and students book sessions with Google Meet links.

## Tech Stack
- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** PostgreSQL + Prisma ORM (v7)
- **Auth:** NextAuth with Google OAuth
- **Calendar:** Google Calendar API (event creation/deletion + Meet links)
- **Email:** Resend (booking notifications to teacher)
- **Styling:** Tailwind CSS

## Project Structure
```
app/
├── prisma/schema.prisma          # DB models: Teacher, Availability, Booking
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── availability/     # GET/POST teacher availability (locked slots)
│   │   │   ├── bookings/         # GET/POST bookings
│   │   │   │   └── [id]/cancel/  # POST cancel + delete calendar event
│   │   │   ├── slots/            # GET available slots for students
│   │   │   └── teacher/timezone/ # POST auto-detect timezone
│   │   ├── book/[slug]/          # Student booking page
│   │   │   └── success/          # Booking confirmation page
│   │   └── dashboard/            # Teacher dashboard
│   │       ├── availability/     # Availability grid settings
│   │       └── bookings/         # Bookings list
│   ├── lib/
│   │   ├── auth.ts               # NextAuth config
│   │   ├── prisma.ts             # Prisma client
│   │   ├── google-calendar.ts    # Create/delete Google Calendar events
│   │   └── email.ts              # Resend email notifications
│   └── generated/prisma/         # Generated Prisma client (do not edit)
```

## Key Concepts
- **Availability:** All slots (6:00-24:00) are open by default. Teachers "lock" slots they're unavailable for. Locked slots are stored as Availability rows.
- **Bookings:** Students select consecutive slots on a single date. Consecutive slots are merged into one booking record with one Google Calendar event and one Meet link.
- **Cancel:** Cancelling a booking also deletes the Google Calendar event via `googleEventId`.
- **Timezone:** Teacher timezone is auto-detected from browser. Student sees slots in their own timezone; all times stored as UTC in DB.

## Commands
```bash
npm run dev          # Start dev server on port 8888
npx prisma migrate dev --name <name>  # Create + apply migration
npx prisma generate  # Regenerate Prisma client after schema changes
```

## Environment Variables
See `.env` for required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` — NextAuth config
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth
- `RESEND_API_KEY` — Resend email (optional, emails skipped if empty)

## API Documentation
See `API.md` for full endpoint documentation.
