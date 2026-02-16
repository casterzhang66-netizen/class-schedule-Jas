# Course Schedule API Documentation

Base URL: `http://localhost:8888`

---

## Authentication

Teacher endpoints require a NextAuth session (Google OAuth login).
Student endpoints are public (no login required).

---

## Endpoints

### 1. `GET /api/availability`

**Auth:** Required (teacher)

Get the logged-in teacher's locked time slots.

**Response:**
```json
[
  {
    "id": "clx...",
    "teacherId": "clx...",
    "dayOfWeek": 0,
    "startTime": "09:00",
    "endTime": "10:00",
    "isRecurring": true
  }
]
```

> Note: Rows represent **locked** slots. Slots without a row are open by default.

---

### 2. `POST /api/availability`

**Auth:** Required (teacher)

Toggle a time slot between open and locked. If the slot exists, it gets deleted (unlocked). If it doesn't exist, it gets created (locked).

**Request Body:**
```json
{
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "10:00"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `dayOfWeek` | `number` | 0 = Sunday, 1 = Monday, ..., 6 = Saturday |
| `startTime` | `string` | Start time in teacher's timezone, e.g. `"09:00"` |
| `endTime` | `string` | End time in teacher's timezone, e.g. `"10:00"` |

**Response:**
```json
{ "action": "removed" }
// or
{ "action": "added", "slot": { "id": "clx...", ... } }
```

---

### 3. `GET /api/slots`

**Auth:** None (public, used by students)

Get available time slots for a teacher on a specific date, converted to the student's timezone. Slots that overlap with any confirmed booking are excluded.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | Yes | Teacher's unique URL slug, e.g. `zhang-caster` |
| `date` | `string` | Yes | Date in `YYYY-MM-DD` format (in student's timezone) |
| `tz` | `string` | No | Student's timezone, e.g. `America/Los_Angeles`. Defaults to `UTC` |

**Example:** `GET /api/slots?slug=zhang-caster&date=2026-02-17&tz=Asia/Shanghai`

**Response:**
```json
{
  "teacher": {
    "id": "clx...",
    "name": "Zhang Caster",
    "timezone": "America/Los_Angeles"
  },
  "slots": [
    {
      "startTime": "01:00",
      "endTime": "02:00",
      "startUTC": "2026-02-17T17:00:00.000Z",
      "endUTC": "2026-02-17T18:00:00.000Z"
    }
  ]
}
```

| Response Field | Description |
|----------------|-------------|
| `slots[].startTime` | Display time in the student's timezone |
| `slots[].endTime` | Display time in the student's timezone |
| `slots[].startUTC` | Actual start time in UTC (used when creating booking) |
| `slots[].endUTC` | Actual end time in UTC (used when creating booking) |

**Errors:**
- `400` — `slug` or `date` missing
- `404` — Teacher not found

---

### 4. `GET /api/bookings`

**Auth:** Required (teacher)

Get all bookings for the logged-in teacher, ordered by start time.

**Response:**
```json
[
  {
    "id": "clx...",
    "teacherId": "clx...",
    "studentName": "Alice",
    "studentEmail": "",
    "subjectName": "Math",
    "notes": "Algebra review",
    "startTime": "2026-02-17T17:00:00.000Z",
    "endTime": "2026-02-17T19:00:00.000Z",
    "meetingLink": "https://meet.google.com/abc-defg-hij",
    "googleEventId": "abc123...",
    "status": "confirmed",
    "createdAt": "2026-02-16T10:00:00.000Z"
  }
]
```

> Note: A booking may span multiple hours (e.g. 2-hour session from consecutive slot selection). The `googleEventId` is stored to enable calendar event deletion on cancel.

---

### 5. `POST /api/bookings`

**Auth:** None (public, used by students)

Create a booking from one or more consecutive time slots. Consecutive slots are merged into a single booking with one Google Calendar event and one Meet link. Sends an email notification to the teacher via Resend.

**Request Body:**
```json
{
  "bookings": [
    {
      "teacherId": "clx...",
      "studentName": "Alice",
      "subjectName": "Math",
      "notes": "Algebra review",
      "startTime": "2026-02-17T17:00:00.000Z",
      "endTime": "2026-02-17T18:00:00.000Z",
      "date": "2026-02-17",
      "displayStart": "09:00",
      "displayEnd": "10:00"
    },
    {
      "teacherId": "clx...",
      "studentName": "Alice",
      "subjectName": "Math",
      "notes": "Algebra review",
      "startTime": "2026-02-17T18:00:00.000Z",
      "endTime": "2026-02-17T19:00:00.000Z",
      "date": "2026-02-17",
      "displayStart": "10:00",
      "displayEnd": "11:00"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bookings` | `array` | Yes | Array of consecutive slot objects |
| `bookings[].teacherId` | `string` | Yes | Teacher's ID |
| `bookings[].studentName` | `string` | Yes | Student's full name |
| `bookings[].subjectName` | `string` | Yes | Subject for the session |
| `bookings[].notes` | `string` | Yes | Specific areas to cover |
| `bookings[].startTime` | `string` | Yes | ISO 8601 UTC datetime |
| `bookings[].endTime` | `string` | Yes | ISO 8601 UTC datetime |
| `bookings[].date` | `string` | Yes | Display date (YYYY-MM-DD) |
| `bookings[].displayStart` | `string` | Yes | Display start time in student's tz |
| `bookings[].displayEnd` | `string` | Yes | Display end time in student's tz |

**Response:**
```json
{
  "bookings": [
    {
      "id": "clx...",
      "teacherId": "clx...",
      "studentName": "Alice",
      "subjectName": "Math",
      "notes": "Algebra review",
      "startTime": "2026-02-17T17:00:00.000Z",
      "endTime": "2026-02-17T19:00:00.000Z",
      "meetingLink": "https://meet.google.com/abc-defg-hij",
      "googleEventId": "abc123...",
      "status": "confirmed",
      "date": "2026-02-17",
      "displayStart": "09:00",
      "displayEnd": "11:00"
    }
  ]
}
```

> Note: Multiple input slots are merged into a single booking record spanning the full time range.

**Side effects:**
- Creates one Google Calendar event with Meet link (spanning merged range)
- Sends one email notification to the teacher via Resend (if `RESEND_API_KEY` is set)

**Errors:**
- `400` — `bookings` array missing or empty
- `404` — Teacher not found
- `409` — One or more slots overlap with an existing booking

---

### 6. `POST /api/bookings/[id]/cancel`

**Auth:** Required (teacher)

Cancel a booking by setting its status to `"cancelled"`. Also deletes the associated Google Calendar event if `googleEventId` is stored.

**URL Parameter:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` | Booking ID |

**Request Body:** None

**Response:**
```json
{
  "id": "clx...",
  "status": "cancelled",
  ...
}
```

**Side effects:**
- Deletes the Google Calendar event (if `googleEventId` exists and teacher has valid OAuth tokens)

---

### 7. `POST /api/teacher/timezone`

**Auth:** Required (teacher)

Update the teacher's timezone. Called automatically when the teacher opens the dashboard (detected from browser).

**Request Body:**
```json
{
  "timezone": "America/Los_Angeles"
}
```

**Response:**
```json
{ "ok": true }
```

---

## Pages

| Path | Auth | Description |
|------|------|-------------|
| `/` | None | Home page with Google sign-in |
| `/dashboard` | Teacher | Weekly grid view — booked/open/locked slots, week navigation, booking link |
| `/dashboard/availability` | Teacher | Toggle grid to lock/unlock time slots (recurring weekly, 6:00-24:00) |
| `/dashboard/bookings` | Teacher | List of confirmed bookings with cancel button |
| `/book/[slug]` | None | Student booking page — pick date, select consecutive slots, fill form |
| `/book/[slug]/success` | None | Booking confirmation with Meet link |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:8888`) |
| `NEXTAUTH_SECRET` | NextAuth secret key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `RESEND_API_KEY` | Resend API key for email notifications (optional — emails skipped if empty) |
