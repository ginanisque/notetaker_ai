import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const BUCKET = "meeting-audio";

export async function uploadMeetingAudio(userId: string, file: File): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "webm";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "audio/webm",
    upsert: false
  });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

export async function getSignedAudioUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    return null;
  }

  return data.signedUrl;
}
