import { NextResponse } from "next/server";
import { getRequiredEnv } from "@/lib/env";
import { removeMeetingAudio } from "@/lib/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RETENTION_DAYS = 30;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${getRequiredEnv("CRON_SECRET")}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("meetings")
    .delete()
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff)
    .select("audio_url");

  if (error) {
    console.error("Trash purge failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const purgedRows = (data ?? []) as { audio_url: string | null }[];
  await Promise.all(
    purgedRows.filter((row) => row.audio_url).map((row) => removeMeetingAudio(row.audio_url as string))
  );

  return NextResponse.json({ purged: purgedRows.length });
}
