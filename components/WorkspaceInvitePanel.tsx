"use client";

import { Copy, Send, Users } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import StatusMessage from "@/components/StatusMessage";
import type { WorkspaceInvite } from "@/lib/types";

interface WorkspaceMemberView {
  id: string;
  role: string;
  email: string | null;
  fullName: string | null;
}

export default function WorkspaceInvitePanel({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState<WorkspaceMemberView[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [lastInvite, setLastInvite] = useState<WorkspaceInvite | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const inviteLink = useMemo(() => {
    if (!lastInvite || typeof window === "undefined") return "";
    return `${window.location.origin}/invites/${lastInvite.id}`;
  }, [lastInvite]);

  async function loadMembers() {
    const response = await fetch(`/api/workspace-invites?workspaceId=${workspaceId}`, { cache: "no-store" });
    const body = (await response.json()) as {
      members?: WorkspaceMemberView[];
      invites?: WorkspaceInvite[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(body.error || "Unable to load workspace members.");
    }

    setMembers(body.members ?? []);
    setInvites(body.invites ?? []);
  }

  useEffect(() => {
    void loadMembers().catch((reason) =>
      setError(reason instanceof Error ? reason.message : "Unable to load workspace members.")
    );
  }, [workspaceId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCopied(false);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/workspace-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, email: email.trim(), role: "member" })
      });
      const body = (await response.json()) as WorkspaceInvite | { error?: string };

      if (!response.ok || "error" in body) {
        throw new Error(("error" in body && body.error) || "Unable to create invite.");
      }

      setLastInvite(body as WorkspaceInvite);
      setEmail("");
      await loadMembers();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create invite.");
    } finally {
      setIsSaving(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
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
          Invite
        </button>
      </form>

      {lastInvite ? (
        <div className="mt-3 rounded-md border border-line bg-white p-3">
          <p className="text-sm text-neutral-700">Share this invite link with {lastInvite.invitedEmail}.</p>
          <button
            type="button"
            onClick={() => void copyInviteLink()}
            className="mt-2 inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
          >
            <Copy className="h-4 w-4" aria-hidden />
            {copied ? "Copied" : "Copy invite link"}
          </button>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 text-sm">
        {members.slice(0, 4).map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-md bg-white px-3 py-2">
            <span className="truncate">{member.fullName || member.email || "Workspace member"}</span>
            <span className="text-xs font-semibold uppercase text-neutral-500">{member.role}</span>
          </div>
        ))}
        {invites.filter((invite) => invite.status === "pending").slice(0, 3).map((invite) => (
          <div key={invite.id} className="flex items-center justify-between rounded-md bg-[#fff7e8] px-3 py-2">
            <span className="truncate">{invite.invitedEmail}</span>
            <span className="text-xs font-semibold uppercase text-gold">pending</span>
          </div>
        ))}
      </div>

      {error ? (
        <div className="mt-3">
          <StatusMessage tone="error">{error}</StatusMessage>
        </div>
      ) : null}
    </div>
  );
}
