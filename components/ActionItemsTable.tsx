"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import type { ActionItem, WorkspaceMember } from "@/lib/types";

export default function ActionItemsTable({ items, members = [] }: { items: ActionItem[]; members?: WorkspaceMember[] }) {
  const [rows, setRows] = useState(items);
  const [error, setError] = useState("");

  async function updateItem(item: ActionItem, patch: Partial<ActionItem>) {
    if (!item.id) return;

    setError("");
    setRows((current) => current.map((row) => (row.id === item.id ? { ...row, ...patch } : row)));

    const response = await fetch(`/api/action-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: patch.status,
        deadline: patch.deadline,
        assignedUserId: patch.assignedUserId
      })
    });

    if (!response.ok) {
      setRows((current) => current.map((row) => (row.id === item.id ? item : row)));
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
              <th className="px-4 py-3 font-semibold">Meeting</th>
              <th className="px-4 py-3 font-semibold">Owner</th>
              <th className="px-4 py-3 font-semibold">Deadline</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => (
              <tr key={item.id ?? `${item.task}-${index}`} className="border-t border-line">
                <td className="px-4 py-3 align-top">{item.task}</td>
                <td className="px-4 py-3 align-top text-neutral-700">{item.meetingTitle ?? "Current meeting"}</td>
                <td className="px-4 py-3 align-top text-neutral-700">
                  {members.length > 0 && item.id ? (
                    <select
                      value={item.assignedUserId ?? ""}
                      onChange={(event) =>
                        void updateItem(item, {
                          assignedUserId: event.target.value || null,
                          owner: members.find((member) => member.userId === event.target.value)?.fullName || item.owner
                        })
                      }
                      className="w-40 rounded-md border border-line bg-white px-2 py-1.5 text-sm"
                    >
                      <option value="">{item.owner || "Not specified"}</option>
                      {members.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.fullName || member.email || "Member"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    item.owner
                  )}
                </td>
                <td className="px-4 py-3 align-top text-neutral-700">
                  {item.id ? (
                    <input
                      value={item.deadline}
                      onChange={(event) => setRows((current) => current.map((row) => row.id === item.id ? { ...row, deadline: event.target.value } : row))}
                      onBlur={(event) => void updateItem(item, { deadline: event.target.value })}
                      className="w-36 rounded-md border border-line bg-white px-2 py-1.5 text-sm"
                    />
                  ) : (
                    item.deadline
                  )}
                </td>
                <td className="px-4 py-3 align-top text-neutral-700">
                  {item.id ? (
                    <select
                      value={item.status ?? "open"}
                      onChange={(event) =>
                        void updateItem(item, { status: event.target.value as "open" | "in_progress" | "done" })
                      }
                      className="rounded-md border border-line bg-white px-2 py-1.5 text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                    </select>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      {item.status === "done" ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : null}
                      {item.status ?? "open"}
                    </span>
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
