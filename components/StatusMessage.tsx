import type { ReactNode } from "react";

interface StatusMessageProps {
  tone?: "info" | "error" | "success";
  children: ReactNode;
}

export default function StatusMessage({ tone = "info", children }: StatusMessageProps) {
  const toneClass = {
    info: "border-line bg-white text-ink",
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800"
  }[tone];

  return <div className={`rounded-md border px-4 py-3 text-sm ${toneClass}`}>{children}</div>;
}
