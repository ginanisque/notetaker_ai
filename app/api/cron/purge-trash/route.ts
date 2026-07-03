import { NextResponse } from "next/server";
import { getRequiredEnv } from "@/lib/env";
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

  const { error, count } = await admin
    .from("meetings")
    .delete({ count: "exact" })
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff);

  if (error) {
    console.error("Trash purge failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ purged: count ?? 0 });
}
