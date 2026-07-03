"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function MeetingSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }

    router.push(`/meetings?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="surface flex items-center gap-2 rounded-md p-2">
      <Search className="ml-2 h-4 w-4 text-neutral-500" aria-hidden />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search meetings"
        className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none"
      />
      <button
        type="submit"
        className="rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent"
      >
        Search
      </button>
    </form>
  );
}
