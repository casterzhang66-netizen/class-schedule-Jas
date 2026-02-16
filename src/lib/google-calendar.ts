import { google } from "googleapis";

interface CreateEventParams {
  teacherAccessToken: string;
  teacherRefreshToken: string;
  teacherEmail: string;
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
}

interface CreateEventResult {
  hangoutLink: string | null;
  eventId: string | null;
}

function getOAuth2Client(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return oauth2Client;
}

export async function createGoogleMeetEvent(
  params: CreateEventParams
): Promise<CreateEventResult> {
  const oauth2Client = getOAuth2Client(
    params.teacherAccessToken,
    params.teacherRefreshToken
  );

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const event = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: {
        dateTime: params.startTime.toISOString(),
      },
      end: {
        dateTime: params.endTime.toISOString(),
      },
      attendees: [{ email: params.teacherEmail }],
      conferenceData: {
        createRequest: {
          requestId: `booking-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  return {
    hangoutLink: event.data.hangoutLink || null,
    eventId: event.data.id || null,
  };
}

interface DeleteEventParams {
  teacherAccessToken: string;
  teacherRefreshToken: string;
  eventId: string;
}

export async function deleteGoogleCalendarEvent(
  params: DeleteEventParams
): Promise<void> {
  const oauth2Client = getOAuth2Client(
    params.teacherAccessToken,
    params.teacherRefreshToken
  );

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  await calendar.events.delete({
    calendarId: "primary",
    eventId: params.eventId,
    sendUpdates: "all",
  });
}
