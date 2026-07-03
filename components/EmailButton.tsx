"use client";

import { Mail } from "lucide-react";

export default function EmailButton({ subject, body }: { subject: string; body: string }) {
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink shadow-sm transition hover:border-accent hover:text-accent"
    >
      <Mail className="h-4 w-4" aria-hidden />
      Email follow-up
    </a>
  );
}
