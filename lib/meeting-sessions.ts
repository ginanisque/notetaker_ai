import "server-only";
import type { MeetingSession } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type MeetingSessionRow = {
  id: string;
  workspace_id: string;
  host_id: string;
  title: string | null;
  status: "active" | "ended";
  started_at: string;
  ended_at: string | null;
};

function mapSession(row: MeetingSessionRow): MeetingSession {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    hostId: row.host_id,
    hostEmail: null,
    title: row.title,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at
  };
}

// A session an owner never explicitly ended (crashed tab, PC power loss,
// browser killed mid-recording) would otherwise stay "active" forever,
// permanently locking teammates out of recording in that workspace.
const STALE_SESSION_MS = 4 * 60 * 60 * 1000;

export async function getActiveMeetingSession(workspaceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("meeting_sessions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const row = data as MeetingSessionRow;
  if (Date.now() - new Date(row.started_at).getTime() > STALE_SESSION_MS) {
    const { error: endError } = await supabase
      .from("meeting_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", row.id);

    if (endError) {
      throw new Error(endError.message);
    }

    return null;
  }

  return mapSession(row);
}

export async function startMeetingSession(workspaceId: string, title?: string | null, takeOver = false) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to start a meeting session.");
  }

  const activeSession = await getActiveMeetingSession(workspaceId);

  if (activeSession && activeSession.hostId !== user.id && !takeOver) {
    throw new Error("Another team member is already recording in this workspace.");
  }

  if (activeSession && activeSession.hostId !== user.id && takeOver) {
    const { error: endError } = await supabase
      .from("meeting_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", activeSession.id);

    if (endError) {
      throw new Error(endError.message);
    }
  }

  if (activeSession && activeSession.hostId === user.id) {
    return activeSession;
  }

  const { data, error } = await supabase
    .from("meeting_sessions")
    .insert({
      workspace_id: workspaceId,
      host_id: user.id,
      title: title?.trim() || null
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSession(data as MeetingSessionRow);
}

export async function endMeetingSession(sessionId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("meeting_sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSession(data as MeetingSessionRow);
}
