import "server-only";
import { getRequiredEnv } from "@/lib/env";
import { cleanGoogleEvent, type CleanedCalendarEvent, type GoogleCalendarEvent } from "@/lib/meeting-platform";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getRequiredEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: getRequiredEnv("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state
  });

  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getRequiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: getRequiredEnv("GOOGLE_REDIRECT_URI"),
      code,
      grant_type: "authorization_code"
    })
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${await response.text()}`);
  }

  return (await response.json()) as TokenResponse;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getRequiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed: ${await response.text()}`);
  }

  return (await response.json()) as TokenResponse;
}

export async function saveGoogleConnection(userId: string, tokens: TokenResponse): Promise<void> {
  const admin = createSupabaseAdminClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error } = await admin.from("calendar_connections").upsert(
    {
      user_id: userId,
      provider: "google",
      access_token: tokens.access_token,
      // Google only returns a refresh_token on first consent (with
      // prompt=consent forced) -- keep the existing one on reconnect if a
      // new one wasn't issued this time.
      ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,provider" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getConnectionStatus(userId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("calendar_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  return Boolean(data);
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data: connection, error } = await admin
    .from("calendar_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (error || !connection) {
    return null;
  }

  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  const isExpiringSoon = expiresAt < Date.now() + 60_000;

  if (!isExpiringSoon) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    return null;
  }

  const refreshed = await refreshAccessToken(connection.refresh_token);
  await saveGoogleConnection(userId, refreshed);

  return refreshed.access_token;
}

export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("calendar_connections").delete().eq("user_id", userId).eq("provider", "google");

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchUpcomingEvents(accessToken: string): Promise<CleanedCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "20"
  });

  const response = await fetch(`${EVENTS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Unable to load calendar events: ${await response.text()}`);
  }

  const body = (await response.json()) as { items?: GoogleCalendarEvent[] };
  return (body.items ?? []).map(cleanGoogleEvent);
}

export async function fetchSingleEvent(accessToken: string, eventId: string): Promise<CleanedCalendarEvent> {
  const response = await fetch(`${EVENTS_URL}/${encodeURIComponent(eventId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Unable to load calendar event: ${await response.text()}`);
  }

  const event = (await response.json()) as GoogleCalendarEvent;
  return cleanGoogleEvent(event);
}
