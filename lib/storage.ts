import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const BUCKET = "meeting-audio";

export async function downloadMeetingAudio(path: string): Promise<Blob> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);

  if (error || !data) {
    throw new Error(error?.message || "Unable to download recorded audio.");
  }

  return data;
}

export async function removeMeetingAudio(path: string): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.storage.from(BUCKET).remove([path]);
  } catch (error) {
    console.error("Failed to remove orphaned audio upload:", error);
  }
}

export async function getSignedAudioUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    return null;
  }

  return data.signedUrl;
}
