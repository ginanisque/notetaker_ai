export type MeetingPlatform = "Google Meet" | "Zoom" | "Microsoft Teams" | "Other";

export type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{ entryPointType: string; uri: string }>;
  };
  attendees?: Array<{ email: string; displayName?: string }>;
};

export type CleanedCalendarEvent = {
  externalEventId: string;
  title: string;
  description: string | null;
  location: string | null;
  meetingUrl: string | null;
  platform: MeetingPlatform | null;
  startTime: string | null;
  endTime: string | null;
  attendees: Array<{ email: string; displayName: string | null }>;
};

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

export function detectMeetingPlatform(url: string | null | undefined): MeetingPlatform | null {
  if (!url) return null;
  if (url.includes("meet.google.com")) return "Google Meet";
  if (url.includes("zoom.us")) return "Zoom";
  if (url.includes("teams.microsoft.com")) return "Microsoft Teams";
  return "Other";
}

export function extractMeetingLink(event: GoogleCalendarEvent): string | null {
  const videoEntryPoint = event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video");
  if (videoEntryPoint?.uri) {
    return videoEntryPoint.uri;
  }

  if (event.hangoutLink) {
    return event.hangoutLink;
  }

  const candidateText = [event.location, event.description].filter(Boolean).join(" ");
  const matches = candidateText.match(URL_PATTERN);

  if (!matches) {
    return null;
  }

  const knownPlatformUrl = matches.find(
    (url) => url.includes("meet.google.com") || url.includes("zoom.us") || url.includes("teams.microsoft.com")
  );

  return knownPlatformUrl ?? matches[0];
}

export function cleanGoogleEvent(event: GoogleCalendarEvent): CleanedCalendarEvent {
  const meetingUrl = extractMeetingLink(event);

  return {
    externalEventId: event.id,
    title: event.summary || "Untitled event",
    description: event.description ?? null,
    location: event.location ?? null,
    meetingUrl,
    platform: detectMeetingPlatform(meetingUrl),
    startTime: event.start?.dateTime ?? event.start?.date ?? null,
    endTime: event.end?.dateTime ?? event.end?.date ?? null,
    attendees: (event.attendees ?? []).map((attendee) => ({
      email: attendee.email,
      displayName: attendee.displayName ?? null
    }))
  };
}
