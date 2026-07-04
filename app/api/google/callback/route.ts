import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { exchangeCodeForTokens, saveGoogleConnection } from "@/lib/google-calendar";

export const runtime = "nodejs";

function redirectAndClearState(request: Request, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.delete("google_oauth_state");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_oauth_state")?.value;

  if (oauthError || !code || !state || !expectedState || state !== expectedState) {
    return redirectAndClearState(request, "/integrations?error=google_auth_failed");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveGoogleConnection(user.id, tokens);
  } catch (error) {
    console.error("Google Calendar connection failed:", error);
    return redirectAndClearState(request, "/integrations?error=google_auth_failed");
  }

  return redirectAndClearState(request, "/integrations?connected=true");
}
