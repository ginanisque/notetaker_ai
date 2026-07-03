"use client";

import { Send, Trash2, Users } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import StatusMessage from "@/components/StatusMessage";

interface WorkspaceMemberView {
  id: string;
  role: string;
  email: string | null;
  fullName: string | null;
}

export default function WorkspaceInvitePanel({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState<WorkspaceMemberView[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadMembers() {
    const response = await fetch(`/api/workspace-invites?workspaceId=${workspaceId}`, { cache: "no-store" });
    const body = (await response.json()) as {
      members?: WorkspaceMemberView[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(body.error || "Unable to load workspace members.");
    }

    setMembers(body.members ?? []);
  }

  useEffect(() => {
    void loadMembers().catch((reason) =>
      setError(reason instanceof Error ? reason.message : "Unable to load workspace members.")
    );
  }, [workspaceId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/workspace-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, email: email.trim() })
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok || "error" in body) {
        throw new Error(("error" in body && body.error) || "Unable to create invite.");
      }

      setEmail("");
      setMessage("Member added to workspace.");
      await loadMembers();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create invite.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeMember(memberId: string) {
    setError("");
    const response = await fetch(`/api/workspace-members?workspaceId=${workspaceId}&memberId=${memberId}`, {
      method: "DELETE"
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(body.error || "Unable to remove member.");
      return;
    }
    await loadMembers();
  }

  return (
    <div className="surface rounded-md p-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-accent" aria-hidden />
        <p className="font-semibold text-ink">Team access</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="teammate@example.com"
          type="email"
          className="min-w-0 flex-1 rounded-md border border-line bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f5f55] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden />
          Add
        </button>
      </form>

      <div className="mt-4 grid gap-2 text-sm">
        {members.slice(0, 8).map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-md bg-white px-3 py-2">
            <span className="truncate">{member.fullName || member.email || "Workspace member"}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-neutral-500">{member.role}</span>
              {member.role !== "owner" ? (
                <button
                  type="button"
                  onClick={() => void removeMember(member.id)}
                  className="text-neutral-400 transition hover:text-red-700"
                  title="Remove member"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {message ? (
        <div className="mt-3">
          <StatusMessage tone="success">{message}</StatusMessage>
        </div>
      ) : null}
      {error ? (
        <div className="mt-3">
          <StatusMessage tone="error">{error}</StatusMessage>
        </div>
      ) : null}
    </div>
  );
}
