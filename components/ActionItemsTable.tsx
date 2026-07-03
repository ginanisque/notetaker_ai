"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import type { ActionItem } from "@/lib/types";

export default function ActionItemsTable({ items }: { items: ActionItem[] }) {
  const [rows, setRows] = useState(items);
  const [error, setError] = useState("");

  async function toggleStatus(item: ActionItem) {
    if (!item.id) return;

    const nextStatus = item.status === "done" ? "open" : "done";
    setError("");
    setRows((current) => current.map((row) => (row.id === item.id ? { ...row, status: nextStatus } : row)));

    const response = await fetch(`/api/action-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });

    if (!response.ok) {
      setRows((current) => current.map((row) => (row.id === item.id ? { ...row, status: item.status } : row)));
      setError("Unable to update action item.");
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-neutral-600">No action items captured.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-md border border-line bg-white/90 shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#ece7db] text-xs uppercase tracking-wide text-neutral-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Task</th>
              <th className="px-4 py-3 font-semibold">Owner</th>
              <th className="px-4 py-3 font-semibold">Deadline</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => (
              <tr key={item.id ?? `${item.task}-${index}`} className="border-t border-line">
                <td className="px-4 py-3 align-top">{item.task}</td>
                <td className="px-4 py-3 align-top text-neutral-700">{item.owner}</td>
                <td className="px-4 py-3 align-top text-neutral-700">{item.deadline}</td>
                <td className="px-4 py-3 align-top text-neutral-700">
                  {item.id ? (
                    <button
                      type="button"
                      onClick={() => void toggleStatus(item)}
                      className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent"
                    >
                      {item.status === "done" ? (
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                      ) : (
                        <Circle className="h-4 w-4" aria-hidden />
                      )}
                      {item.status ?? "open"}
                    </button>
                  ) : (
                    item.status ?? "open"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
