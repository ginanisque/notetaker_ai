"use client";

import { Mic, Radio, Square, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StatusMessage from "@/components/StatusMessage";
import type { MeetingRecord, MeetingSession, MeetingSummary, SaveMeetingInput, Workspace } from "@/lib/types";

type ProcessingStep = "idle" | "recording" | "transcribing" | "summarizing" | "saving" | "complete";

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function Recorder({
  workspaces,
  initialWorkspaceId = ""
}: {
  workspaces: Workspace[];
  initialWorkspaceId?: string;
}) {
  const router = useRouter();
  const [meetingTitle, setMeetingTitle] = useState("");
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId);
  const [activeSession, setActiveSession] = useState<MeetingSession | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [canRecordInWorkspace, setCanRecordInWorkspace] = useState(true);
  const [canTakeOver, setCanTakeOver] = useState(false);
  const [step, setStep] = useState<ProcessingStep>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const sessionIdRef = useRef<string | null>(null);

  const isRecording = step === "recording";
  const isProcessing = ["transcribing", "summarizing", "saving"].includes(step);
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);

  useEffect(() => {
    if (!isRecording) return;

    const interval = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
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

  async function startWorkspaceSession(takeOver = false) {
    if (!workspaceId) return null;

    const response = await fetch("/api/meeting-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        title: meetingTitle.trim(),
        takeOver
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

  async function startListening() {
    setError("");
    setSeconds(0);
    chunksRef.current = [];

    try {
      if (workspaceId && !canRecordInWorkspace) {
        throw new Error("Another team member is already recording in this workspace.");
      }

      const sessionId = await startWorkspaceSession(false);
      setCurrentSessionId(sessionId);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        void processRecording(mimeType || "audio/webm");
      };

      recorder.start();
      setStep("recording");
    } catch (reason) {
      await endWorkspaceSession(sessionIdRef.current);
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
  }

  async function processRecording(mimeType: string) {
    const blob = new Blob(chunksRef.current, { type: mimeType });

    if (!blob.size) {
      setError("No audio was captured. Please try recording again.");
      setStep("idle");
      return;
    }

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(blob));

    try {
      setStep("transcribing");
      const formData = new FormData();
      const extension = mimeType.includes("webm") ? "webm" : "audio";
      const audioFileName = `meeting-${Date.now()}.${extension}`;
      formData.append("audio", blob, audioFileName);
      formData.append("durationSeconds", String(seconds));

      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData
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

      setStep("summarizing");
      const summarizeResponse = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcribeJson.transcript,
          meetingTitle: meetingTitle.trim()
        })
      });
      const summarizeJson = (await summarizeResponse.json()) as MeetingSummary | { error?: string };
      if (!summarizeResponse.ok || "error" in summarizeJson) {
        throw new Error(("error" in summarizeJson && summarizeJson.error) || "Summarization failed.");
      }
      const summary = summarizeJson as MeetingSummary;

      setStep("saving");
      const title = summary.meetingTitle || meetingTitle.trim() || "Untitled meeting";
      const meeting: SaveMeetingInput = {
        title,
        workspaceId: workspaceId || null,
        meetingSessionId: sessionIdRef.current,
        date: new Date().toISOString(),
        transcript: transcribeJson.transcript,
        summary: { ...summary, meetingTitle: title },
        audioUrl: transcribeJson.audioUrl ?? null,
        audioFileName
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
      router.push(`/meetings/${savedMeeting.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong while processing the meeting.");
      setStep("idle");
    } finally {
      await endWorkspaceSession(sessionIdRef.current);
    }
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
        Please inform meeting participants that this meeting is being recorded and transcribed for note-taking purposes.
      </StatusMessage>

      {workspaceId && activeSession && !canRecordInWorkspace ? (
        <StatusMessage tone="error">
          {selectedWorkspace?.name ?? "This workspace"} already has an active recorder. Start time:{" "}
          {new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(new Date(activeSession.startedAt))}.
          {canTakeOver ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                void startWorkspaceSession(true).catch((reason) =>
                  setError(reason instanceof Error ? reason.message : "Unable to take over recording.")
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
            disabled={isRecording || isProcessing || (workspaceId ? !canRecordInWorkspace : false)}
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

      <StatusMessage tone={step === "complete" ? "success" : "info"}>
        <span className="inline-flex items-center gap-2">
          {isProcessing ? <Upload className="h-4 w-4 animate-pulse" aria-hidden /> : null}
          {status}
        </span>
      </StatusMessage>

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}

      {audioUrl ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink">Audio preview</p>
          <audio src={audioUrl} controls className="w-full" />
        </div>
      ) : null}
    </div>
  );
}
