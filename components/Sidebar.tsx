import Link from "next/link";
import { AudioLines, ClipboardList, CreditCard, ListChecks, Mic, Trash2 } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import NotificationBell from "@/components/NotificationBell";
import type { MeetingRecord, Workspace } from "@/lib/types";

const navLinks = [
  { href: "/meetings", label: "Meetings", icon: ListChecks },
  { href: "/record", label: "Record", icon: Mic },
  { href: "/meetings/trash", label: "Trash", icon: Trash2 },
  { href: "/billing", label: "Billing", icon: CreditCard }
];

export default function Sidebar({
  workspaces,
  recentMeetings,
  unreadCount
}: {
  workspaces: Workspace[];
  recentMeetings: MeetingRecord[];
  unreadCount: number;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line/80 bg-white/60 px-4 py-6 lg:flex">
      <Link href="/" className="inline-flex items-center gap-2 font-semibold text-ink">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent text-white">
          <AudioLines className="h-5 w-5" aria-hidden />
        </span>
        AI Meeting Note Taker
      </Link>

      <nav className="mt-8 space-y-1">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-mist hover:text-accent"
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        <p className="px-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Workspaces</p>
        <div className="mt-2 space-y-1">
          <Link
            href="/meetings"
            className="block rounded-md px-3 py-2 text-sm text-neutral-700 transition hover:bg-mist hover:text-accent"
          >
            Personal
          </Link>
          {workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              href={`/workspaces/${workspace.id}`}
              className="block truncate rounded-md px-3 py-2 text-sm text-neutral-700 transition hover:bg-mist hover:text-accent"
              title={workspace.name}
            >
              {workspace.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 flex-1 overflow-hidden">
        <p className="px-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Recent meetings</p>
        <div className="mt-2 space-y-1">
          {recentMeetings.length > 0 ? (
            recentMeetings.map((meeting) => (
              <Link
                key={meeting.id}
                href={`/meetings/${meeting.id}`}
                className="flex items-center gap-2 truncate rounded-md px-3 py-2 text-sm text-neutral-700 transition hover:bg-mist hover:text-accent"
                title={meeting.title}
              >
                <ClipboardList className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                <span className="truncate">{meeting.title}</span>
              </Link>
            ))
          ) : (
            <p className="px-3 text-sm text-neutral-500">No meetings yet.</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-line/80 pt-4">
        <NotificationBell initialCount={unreadCount} />
        <LogoutButton />
      </div>
    </aside>
  );
}
