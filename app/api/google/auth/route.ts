import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGoogleAuthUrl } from "@/lib/google-calendar";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(getGoogleAuthUrl(state));

  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/"
  });

  return response;
}
