"use client";

import { Download } from "lucide-react";

export default function DownloadNotesButton({ filename, text }: { filename: string; text: string }) {
  function download() {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink shadow-sm transition hover:border-accent hover:text-accent"
    >
      <Download className="h-4 w-4" aria-hidden />
      Download notes
    </button>
  );
}
