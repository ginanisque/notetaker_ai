"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import type { WorkspaceMember } from "@/lib/types";

export default function EmailTeamButton({
  members,
  subject,
  body
}: {
  members: WorkspaceMember[];
  subject: string;
  body: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const recipients = members
    .filter((member) => member.email && selected.includes(member.userId))
    .map((member) => member.email)
    .join(",");
  const href = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  if (members.length === 0) return null;

  return (
    <div className="rounded-md border border-line bg-white/90 p-4 shadow-sm">
      <p className="font-semibold text-ink">Email notes to team</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {members.map((member) => (
          <label key={member.userId} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(member.userId)}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, member.userId]
                    : current.filter((id) => id !== member.userId)
                )
              }
            />
            {member.fullName || member.email || "Member"}
          </label>
        ))}
      </div>
      <a
        href={href}
        className="mt-3 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white"
      >
        <Mail className="h-4 w-4" aria-hidden />
        Open email draft
      </a>
    </div>
  );
}
