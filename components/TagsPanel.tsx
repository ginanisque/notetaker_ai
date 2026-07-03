"use client";

import { Tag } from "lucide-react";
import { useState, type FormEvent } from "react";
import StatusMessage from "@/components/StatusMessage";
import type { MeetingTag } from "@/lib/types";

const presets = ["Client", "Internal", "School", "Website", "Finance", "Urgent", "Follow-up needed"];

export default function TagsPanel({
  meetingId,
  workspaceId,
  tags
}: {
  meetingId: string;
  workspaceId?: string | null;
  tags: MeetingTag[];
}) {
  const [rows, setRows] = useState(tags);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function addTag(tagName: string) {
    setError("");
    const response = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId, workspaceId, name: tagName })
    });
    const body = (await response.json()) as MeetingTag | { error?: string };
    if (!response.ok || "error" in body) {
      setError(("error" in body && body.error) || "Unable to add tag.");
      return;
    }
    const tag = body as MeetingTag;
    setRows((current) => (current.some((item) => item.id === tag.id) ? current : [...current, tag]));
    setName("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim()) void addTag(name.trim());
  }

  return (
    <section className="space-y-3">
      <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-ink">
        <Tag className="h-5 w-5 text-accent" aria-hidden />
        Tags
      </h2>
      <div className="flex flex-wrap gap-2">
        {rows.map((tag) => (
          <span key={tag.id} className="rounded-md bg-mist px-3 py-1.5 text-sm font-semibold text-accent">
            {tag.name}
          </span>
        ))}
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Add tag"
          className="min-w-0 flex-1 rounded-md border border-line bg-white px-3 py-2 outline-none focus:border-accent"
        />
        <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">Add</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => void addTag(preset)}
            className="rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:border-accent hover:text-accent"
          >
            {preset}
          </button>
        ))}
      </div>
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    </section>
  );
}
