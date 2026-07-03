"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import StatusMessage from "@/components/StatusMessage";

export default function WorkspaceCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Workspace name is required.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() })
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Unable to create workspace.");
      }

      setName("");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create workspace.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-line bg-white p-4">
      <label htmlFor="workspaceName" className="text-sm font-semibold text-ink">
        New workspace
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="workspaceName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Team or client name"
          className="min-w-0 flex-1 rounded-md border border-line bg-white px-3 py-2 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f5f55] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Create
        </button>
      </div>
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    </form>
  );
}
