"use client";

import { CalendarClock, ExternalLink, Mic, Radio, Square, Upload, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StatusMessage from "@/components/StatusMessage";
import {
  deleteSession,
  getChunks,
  listSessions,
  saveChunk,
  saveSessionMeta,
  updateSessionMeta,
  type RecordingSessionMeta
} from "@/lib/recording-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  CalendarEventPrefill,
  MeetingRecord,
  MeetingSession,
  MeetingSummary,
  SaveMeetingInput,
  Workspace
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

type ProcessingStep = "idle" | "recording" | "transcribing" | "summarizing" | "saving" | "complete";

type StageResults = {
  storagePath?: string;
  audioUrl?: string | null;
  transcript?: string;
  summary?: MeetingSummary;
  audioFileName?: string;
};

type RecordingContext = {
  workspaceId: string | null;
  meetingTitle: string;
  calendarEvent: CalendarEventPrefill | null;
  seconds: number;
};

// MediaRecorder is asked for a chunk every 10s (instead of only at stop) so
// each chunk can be autosaved to IndexedDB as recording happens - see
// lib/recording-store.ts. That's what makes a mid-recording crash recoverable.
const AUTOSAVE_TIMESLICE_MS = 10000;

const RECORDING_CAP_SECONDS = 40 * 60;
const WARNING_LEAD_SECONDS = 10 * 60;
const EXTENSION_SECONDS = 20 * 60;

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatFallbackTitle(workspaceName: string | undefined, date: Date) {
  const datePart = new Intl.DateTimeFormat("en-CA").format(date);
  const timePart = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return `${workspaceName ?? "Personal"}/${datePart}/${timePart}`;
}

export default function Recorder({
  workspaces,
  initialWorkspaceId = "",
  userId,
  calendarEvent = null
}: {
  workspaces: Workspace[];
  initialWorkspaceId?: string;
  userId: string;
  calendarEvent?: CalendarEventPrefill | null;
}) {
  const router = useRouter();
  const [meetingTitle, setMeetingTitle] = useState(calendarEvent?.title || "");
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId);
  const [activeSession, setActiveSession] = useState<MeetingSession | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [canRecordInWorkspace, setCanRecordInWorkspace] = useState(true);
  const [canTakeOver, setCanTakeOver] = useState(false);
  const [step, setStep] = useState<ProcessingStep>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [recoverableSessions, setRecoverableSessions] = useState<RecordingSessionMeta[]>([]);
  const [recoveringKey, setRecoveringKey] = useState<string | null>(null);
  const [showExtendPrompt, setShowExtendPrompt] = useState(false);
  const [systemAudioNotice, setSystemAudioNotice] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const secondsRef = useRef(0);
  const recoveryKeyRef = useRef<string>("");
  const chunkIndexRef = useRef(0);
  const mimeTypeRef = useRef<string>("audio/webm");
  const stageResultsRef = useRef<StageResults>({});
  const activeCtxRef = useRef<RecordingContext | null>(null);
  const capSecondsRef = useRef(RECORDING_CAP_SECONDS);
  const warningIssuedForCapRef = useRef<number | null>(null);

  const isRecording = step === "recording";
  const isProcessing = ["transcribing", "summarizing", "saving"].includes(step);
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);

  useEffect(() => {
    if (!isRecording) return;

    const interval = window.setInterval(() => {
      setSeconds((current) => {
        const next = current + 1;
        secondsRef.current = next;
        void updateSessionMeta(recoveryKeyRef.current, { seconds: next });
        return next;
      });

      const elapsed = secondsRef.current;
      const cap = capSecondsRef.current;
      if (elapsed >= cap) {
        stopRecording();
      } else if (cap - elapsed <= WARNING_LEAD_SECONDS && warningIssuedForCapRef.current !== cap) {
        warningIssuedForCapRef.current = cap;
        setShowExtendPrompt(true);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isRecording]);

  useEffect(() => {
    void listSessions().then(setRecoverableSessions);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      displayStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close();
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!workspaceId) {
      setActiveSession(null);
      setCanRecordInWorkspace(true);
      setCanTakeOver(false);
      return;
    }

    let isMounted = true;

    async function loadActiveSession() {
      try {
        const response = await fetch(`/api/meeting-sessions?workspaceId=${workspaceId}`, { cache: "no-store" });
        const body = (await response.json()) as {
          activeSession?: MeetingSession | null;
          canRecord?: boolean;
          canTakeOver?: boolean;
          error?: string;
        };

        if (!isMounted) return;

        if (!response.ok) {
          throw new Error(body.error || "Unable to check workspace recording status.");
        }

        setActiveSession(body.activeSession ?? null);
        setCanRecordInWorkspace(Boolean(body.canRecord));
        setCanTakeOver(Boolean(body.canTakeOver));
      } catch (reason) {
        if (!isMounted) return;
        setError(reason instanceof Error ? reason.message : "Unable to check workspace recording status.");
      }
    }

    void loadActiveSession();

    const interval = window.setInterval(() => {
      void loadActiveSession();
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [workspaceId]);

  async function startWorkspaceSession(opts: { workspaceId: string | null; title: string; takeOver?: boolean }) {
    if (!opts.workspaceId) return null;

    const response = await fetch("/api/meeting-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: opts.workspaceId,
        title: opts.title,
        takeOver: Boolean(opts.takeOver)
      })
    });
    const body = (await response.json()) as MeetingSession | { error?: string };

    if (!response.ok || "error" in body) {
      throw new Error(("error" in body && body.error) || "Unable to start workspace recording session.");
    }

    const session = body as MeetingSession;
    setActiveSession(session);
    setCurrentSessionId(session.id);
    sessionIdRef.current = session.id;
    setCanRecordInWorkspace(true);
    setCanTakeOver(false);
    return session.id;
  }

  async function endWorkspaceSession(sessionId: string | null) {
    if (!sessionId) return;

    await fetch("/api/meeting-sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });

    setCurrentSessionId(null);
    sessionIdRef.current = null;
    setActiveSession(null);
  }

  // getUserMedia only captures the mic, so other participants only reach it
  // acoustically (speaker -> air -> mic) and get suppressed by echo
  // cancellation. Sharing a screen/tab with "Share audio" gives a clean
  // digital feed of the meeting app's own output, which we mix with the mic
  // via the Web Audio API. This is best-effort: any failure/decline/missing
  // audio track falls back to the mic-only stream instead of blocking.
  async function acquireCombinedStream(micStream: MediaStream): Promise<MediaStream> {
    if (!navigator.mediaDevices.getDisplayMedia) {
      return micStream;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      displayStream.getVideoTracks().forEach((track) => track.stop());

      const displayAudioTracks = displayStream.getAudioTracks();
      if (displayAudioTracks.length === 0) {
        displayStream.getTracks().forEach((track) => track.stop());
        setSystemAudioNotice(
          'No audio was shared, so only your microphone will be recorded. Next time, check "Share audio" when prompted to capture everyone clearly.'
        );
        return micStream;
      }

      displayStreamRef.current = displayStream;
      displayAudioTracks[0].onended = () => {
        setSystemAudioNotice("Screen/tab audio sharing stopped - continuing with microphone only.");
      };

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();
      audioContext.createMediaStreamSource(micStream).connect(destination);
      audioContext.createMediaStreamSource(new MediaStream(displayAudioTracks)).connect(destination);

      return destination.stream;
    } catch {
      setSystemAudioNotice(
        'Recording microphone only - screen/tab audio wasn\'t shared. Start again and check "Share audio" when prompted to capture everyone clearly.'
      );
      return micStream;
    }
  }

  async function startListening() {
    setError("");
    setCanRetry(false);
    setSeconds(0);
    secondsRef.current = 0;
    chunksRef.current = [];
    chunkIndexRef.current = 0;
    stageResultsRef.current = {};
    activeCtxRef.current = null;
    capSecondsRef.current = RECORDING_CAP_SECONDS;
    warningIssuedForCapRef.current = null;
    setShowExtendPrompt(false);
    setSystemAudioNotice("");

    const recoveryKey = crypto.randomUUID();
    recoveryKeyRef.current = recoveryKey;

    try {
      if (workspaceId && !canRecordInWorkspace) {
        throw new Error("Another team member is already recording in this workspace.");
      }

      const sessionId = await startWorkspaceSession({ workspaceId: workspaceId || null, title: meetingTitle.trim() });
      setCurrentSessionId(sessionId);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recordingStream = await acquireCombinedStream(stream);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      mimeTypeRef.current = mimeType || "audio/webm";
      const recorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      await saveSessionMeta({
        key: recoveryKey,
        workspaceId: workspaceId || null,
        meetingTitle: meetingTitle.trim(),
        mimeType: mimeTypeRef.current,
        startedAt: new Date().toISOString(),
        seconds: 0,
        calendarEvent
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          const index = chunkIndexRef.current;
          chunkIndexRef.current += 1;
          void saveChunk(recoveryKey, index, event.data);
        }
      };

      recorder.onstop = () => {
        void processRecording(recoveryKey);
      };

      recorder.start(AUTOSAVE_TIMESLICE_MS);
      setStep("recording");
    } catch (reason) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      displayStreamRef.current?.getTracks().forEach((track) => track.stop());
      displayStreamRef.current = null;
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close();
      }
      audioContextRef.current = null;
      await endWorkspaceSession(sessionIdRef.current);
      await deleteSession(recoveryKey);
      setError(
        reason instanceof DOMException && reason.name === "NotAllowedError"
          ? "Microphone access was denied. Please allow microphone access and try again."
          : "Unable to start recording. Please check your microphone and browser permissions."
      );
      setStep("idle");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    displayStreamRef.current?.getTracks().forEach((track) => track.stop());
    displayStreamRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
  }

  function extendRecording() {
    capSecondsRef.current += EXTENSION_SECONDS;
    setShowExtendPrompt(false);
  }

  async function processRecording(recoveryKey: string) {
    const mimeType = mimeTypeRef.current;
    const blob = new Blob(chunksRef.current, { type: mimeType });

    if (!blob.size) {
      setError("No audio was captured. Please try recording again.");
      setStep("idle");
      setCanRetry(false);
      await deleteSession(recoveryKey);
      return;
    }

    if (!activeCtxRef.current) {
      activeCtxRef.current = {
        workspaceId: workspaceId || null,
        meetingTitle: meetingTitle.trim(),
        calendarEvent,
        seconds: secondsRef.current
      };
    }
    const ctx = activeCtxRef.current;
    const results = stageResultsRef.current;

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(blob));

    try {
      setStep("transcribing");
      const extension = mimeType.includes("webm") ? "webm" : "audio";
      const audioFileName = results.audioFileName ?? `meeting-${Date.now()}.${extension}`;
      results.audioFileName = audioFileName;

      let storagePath = results.storagePath;
      if (!storagePath) {
        const supabase = createSupabaseBrowserClient();
        storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("meeting-audio")
          .upload(storagePath, blob, { contentType: mimeType || "audio/webm" });

        if (uploadError) {
          throw new Error(uploadError.message || "Unable to upload the recording.");
        }
        results.storagePath = storagePath;
        await updateSessionMeta(recoveryKey, { storagePath });
      }

      let transcript = results.transcript;
      if (!transcript) {
        const transcribeResponse = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storagePath,
            durationSeconds: ctx.seconds,
            workspaceId: ctx.workspaceId
          })
        });
        const transcribeJson = (await transcribeResponse.json()) as {
          transcript?: string;
          audioUrl?: string | null;
          error?: string;
          code?: string;
        };
        if (!transcribeResponse.ok || !transcribeJson.transcript) {
          if (transcribeJson.code === "USAGE_CAP_EXCEEDED") {
            throw new Error(`${transcribeJson.error} Visit /billing to upgrade.`);
          }
          if (transcribeJson.code === "RATE_LIMITED") {
            throw new Error(transcribeJson.error || "Too many requests. Please wait a few minutes and try again.");
          }
          throw new Error(transcribeJson.error || "Transcription failed.");
        }
        transcript = transcribeJson.transcript;
        results.transcript = transcript;
        results.audioUrl = transcribeJson.audioUrl ?? null;
        await updateSessionMeta(recoveryKey, { transcript, audioUrl: results.audioUrl });
      }

      setStep("summarizing");
      let summary = results.summary;
      if (!summary) {
        const summarizeResponse = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            meetingTitle: ctx.meetingTitle
          })
        });
        const summarizeJson = (await summarizeResponse.json()) as MeetingSummary | { error?: string };
        if (!summarizeResponse.ok || "error" in summarizeJson) {
          throw new Error(("error" in summarizeJson && summarizeJson.error) || "Summarization failed.");
        }
        summary = summarizeJson as MeetingSummary;
        results.summary = summary;
        await updateSessionMeta(recoveryKey, { summary });
      }

      setStep("saving");
      const meetingDate = new Date();
      const contextWorkspace = workspaces.find((workspace) => workspace.id === ctx.workspaceId);
      const title = summary.meetingTitle || ctx.meetingTitle || formatFallbackTitle(contextWorkspace?.name, meetingDate);
      const meeting: SaveMeetingInput = {
        title,
        workspaceId: ctx.workspaceId,
        meetingSessionId: sessionIdRef.current,
        date: meetingDate.toISOString(),
        transcript,
        summary: { ...summary, meetingTitle: title },
        audioUrl: results.audioUrl ?? null,
        audioFileName,
        calendarProvider: ctx.calendarEvent ? "google" : null,
        calendarEventId: ctx.calendarEvent?.calendarEventId ?? null,
        calendarEventUrl: ctx.calendarEvent?.meetingUrl ?? null,
        attendeesJson: ctx.calendarEvent?.attendees.length ? ctx.calendarEvent.attendees : null
      };

      const saveResponse = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meeting)
      });
      const saveJson = (await saveResponse.json()) as MeetingRecord | { error?: string };
      if (!saveResponse.ok || "error" in saveJson) {
        throw new Error(("error" in saveJson && saveJson.error) || "Saving failed.");
      }
      const savedMeeting = saveJson as MeetingRecord;

      setStep("complete");
      setCanRetry(false);
      activeCtxRef.current = null;
      await deleteSession(recoveryKey);
      router.push(`/meetings/${savedMeeting.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong while processing the meeting.");
      setStep("idle");
      setCanRetry(true);
    } finally {
      await endWorkspaceSession(sessionIdRef.current);
    }
  }

  async function handleRecoverSession(session: RecordingSessionMeta) {
    setError("");
    setRecoveringKey(session.key);
    try {
      const chunks = await getChunks(session.key);
      if (!chunks.length) {
        await deleteSession(session.key);
        setRecoverableSessions((prev) => prev.filter((entry) => entry.key !== session.key));
        return;
      }

      recoveryKeyRef.current = session.key;
      mimeTypeRef.current = session.mimeType || "audio/webm";
      chunksRef.current = chunks;
      stageResultsRef.current = {
        storagePath: session.storagePath,
        audioUrl: session.audioUrl,
        transcript: session.transcript,
        summary: session.summary as MeetingSummary | undefined
      };
      activeCtxRef.current = {
        workspaceId: session.workspaceId,
        meetingTitle: session.meetingTitle,
        calendarEvent: (session.calendarEvent as CalendarEventPrefill | null) ?? null,
        seconds: session.seconds
      };
      setCanRetry(true);

      try {
        sessionIdRef.current = await startWorkspaceSession({
          workspaceId: session.workspaceId,
          title: session.meetingTitle,
          takeOver: false
        });
      } catch {
        sessionIdRef.current = null;
      }

      setRecoverableSessions((prev) => prev.filter((entry) => entry.key !== session.key));
      setStep("transcribing");
      await processRecording(session.key);
    } finally {
      setRecoveringKey(null);
    }
  }

  async function handleDiscardSession(key: string) {
    await deleteSession(key);
    setRecoverableSessions((prev) => prev.filter((entry) => entry.key !== key));
  }

  const status = {
    idle: "Ready to record.",
    recording: "Recording in progress.",
    transcribing: "Uploading and transcribing audio.",
    summarizing: "Creating structured notes.",
    saving: "Saving meeting notes.",
    complete: "Meeting saved."
  }[step];

  return (
    <div className="space-y-6">
      {recoverableSessions.map((session) => (
        <StatusMessage key={session.key} tone="error">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Found an unsaved recording from{" "}
              {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
                new Date(session.startedAt)
              )}{" "}
              (~{formatTimer(session.seconds)}) that didn&apos;t finish saving.
            </span>
            <span className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => void handleRecoverSession(session)}
                disabled={recoveringKey === session.key || isRecording || isProcessing}
                className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {recoveringKey === session.key ? "Recovering..." : "Recover"}
              </button>
              <button
                type="button"
                onClick={() => void handleDiscardSession(session.key)}
                disabled={recoveringKey === session.key}
                className="rounded-md border border-red-300 px-3 py-1 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Discard
              </button>
            </span>
          </div>
        </StatusMessage>
      ))}

      {calendarEvent ? (
        <div className="surface space-y-2 rounded-md p-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">From Google Calendar</p>
          {calendarEvent.platform ? (
            <span className="inline-flex rounded-full border border-accent/30 bg-mist px-2 py-0.5 text-xs font-semibold text-accent">
              {calendarEvent.platform}
            </span>
          ) : null}
          {calendarEvent.scheduledStart ? (
            <p className="flex items-center gap-2 text-sm text-neutral-700">
              <CalendarClock className="h-4 w-4 text-neutral-400" aria-hidden />
              {formatDate(calendarEvent.scheduledStart)}
              {calendarEvent.scheduledEnd ? ` - ${formatDate(calendarEvent.scheduledEnd)}` : ""}
            </p>
          ) : null}
          {calendarEvent.meetingUrl ? (
            <a
              href={calendarEvent.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="flex w-fit items-center gap-2 text-sm font-semibold text-accent hover:underline"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Open meeting link
            </a>
          ) : null}
          {calendarEvent.attendees.length > 0 ? (
            <p className="flex items-center gap-2 text-sm text-neutral-700">
              <Users className="h-4 w-4 text-neutral-400" aria-hidden />
              {calendarEvent.attendees.map((attendee) => attendee.displayName || attendee.email).join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-md bg-ink px-5 py-4 text-white">
        <div>
          <p className="text-sm font-semibold text-white/65">Recorder status</p>
          <p className="mt-1 text-lg font-semibold">{status}</p>
        </div>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/10">
          <Radio className={`h-5 w-5 ${isRecording ? "animate-pulse text-red-300" : "text-white/80"}`} aria-hidden />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="meetingTitle" className="text-sm font-semibold text-ink">
          Meeting title
        </label>
        <input
          id="meetingTitle"
          value={meetingTitle}
          onChange={(event) => setMeetingTitle(event.target.value)}
          placeholder="Optional"
          disabled={isRecording || isProcessing}
          className="w-full rounded-md border border-line bg-white px-4 py-3 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="workspaceId" className="text-sm font-semibold text-ink">
          Save location
        </label>
        <select
          id="workspaceId"
          value={workspaceId}
          onChange={(event) => setWorkspaceId(event.target.value)}
          disabled={isRecording || isProcessing}
          className="w-full rounded-md border border-line bg-white px-4 py-3 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        >
          <option value="">Personal meetings</option>
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      </div>

      <StatusMessage>
        Please inform meeting participants that this meeting is being recorded and transcribed for note-taking
        purposes. When you click Start, you&apos;ll also be asked to share a screen or tab with &quot;Share
        audio&quot; checked — choose &quot;Entire Screen&quot; for a WhatsApp call, or the meeting tab for Google
        Meet — so everyone&apos;s voice is captured clearly, not just yours.
      </StatusMessage>

      {systemAudioNotice ? <StatusMessage>{systemAudioNotice}</StatusMessage> : null}

      {workspaceId && activeSession && !canRecordInWorkspace ? (
        <StatusMessage tone="error">
          {selectedWorkspace?.name ?? "This workspace"} already has an active recorder. Start time:{" "}
          {new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(new Date(activeSession.startedAt))}.
          {canTakeOver ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                void startWorkspaceSession({ workspaceId, title: meetingTitle.trim(), takeOver: true }).catch(
                  (reason) => setError(reason instanceof Error ? reason.message : "Unable to take over recording.")
                );
              }}
              className="ml-3 rounded-md bg-white px-3 py-1 text-sm font-semibold text-red-700"
            >
              Take over recorder role
            </button>
          ) : null}
        </StatusMessage>
      ) : workspaceId && activeSession ? (
        <StatusMessage tone="success">
          You are the active recorder for {selectedWorkspace?.name ?? "this workspace"}. Session ID:{" "}
          {activeSession.id.slice(0, 8)}
        </StatusMessage>
      ) : null}

      <div className="flex flex-col gap-4 rounded-md border border-line bg-white/90 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-600">Recording timer</p>
          <p className="mt-1 text-5xl font-semibold tabular-nums text-ink">{formatTimer(seconds)}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startListening}
            disabled={isRecording || isProcessing || recoveringKey !== null || (workspaceId ? !canRecordInWorkspace : false)}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#1f5f55] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Mic className="h-5 w-5" aria-hidden />
            Start Listening
          </button>
          <button
            type="button"
            onClick={stopRecording}
            disabled={!isRecording}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 font-semibold text-ink shadow-sm transition hover:border-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Square className="h-5 w-5" aria-hidden />
            Stop Recording
          </button>
        </div>
      </div>

      {showExtendPrompt && isRecording ? (
        <StatusMessage tone="error">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Recording will stop automatically in {formatTimer(Math.max(0, capSecondsRef.current - seconds))} to
              keep meetings manageable.
            </span>
            <button
              type="button"
              onClick={extendRecording}
              className="shrink-0 rounded-md bg-white px-3 py-1 text-sm font-semibold text-red-700"
            >
              Continue recording (+20 min)
            </button>
          </div>
        </StatusMessage>
      ) : null}

      <StatusMessage tone={step === "complete" ? "success" : "info"}>
        <span className="inline-flex items-center gap-2">
          {isProcessing ? <Upload className="h-4 w-4 animate-pulse" aria-hidden /> : null}
          {status}
        </span>
      </StatusMessage>

      {error ? (
        <StatusMessage tone="error">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            {canRetry && !isRecording && !isProcessing ? (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep("transcribing");
                  void processRecording(recoveryKeyRef.current);
                }}
                className="shrink-0 rounded-md bg-white px-3 py-1 text-sm font-semibold text-red-700"
              >
                Retry
              </button>
            ) : null}
          </div>
        </StatusMessage>
      ) : null}

      {audioUrl ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink">Audio preview</p>
          <audio src={audioUrl} controls className="w-full" />
        </div>
      ) : null}
    </div>
  );
}
