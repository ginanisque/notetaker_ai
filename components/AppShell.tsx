import Link from "next/link";
import type { ReactNode } from "react";
import { AudioLines, CreditCard, ListChecks, Mic } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import NotificationBell from "@/components/NotificationBell";
import Sidebar from "@/components/Sidebar";
import { getMeetings, getWorkspaces } from "@/lib/meetings";
import { getUnreadCommentCount } from "@/lib/notifications";

export default async function AppShell({
  children,
  eyebrow,
  title,
  description,
  actions
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  const [workspaces, recentMeetings, unreadCount] = await Promise.all([
    getWorkspaces(),
    getMeetings().then((meetings) => meetings.slice(0, 5)),
    getUnreadCommentCount()
  ]);

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <Sidebar workspaces={workspaces} recentMeetings={recentMeetings} unreadCount={unreadCount} />

      <div className="flex-1">
        <nav className="flex items-center justify-between gap-2 border-b border-line/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-ink">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent text-white">
              <AudioLines className="h-5 w-5" aria-hidden />
            </span>
            <span className="hidden sm:inline">AI Meeting Note Taker</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/meetings"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-[#eef2ef] hover:text-accent"
            >
              <ListChecks className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Meetings</span>
            </Link>
            <Link
              href="/record"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-[#eef2ef] hover:text-accent"
            >
              <Mic className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Record</span>
            </Link>
            <Link
              href="/billing"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-[#eef2ef] hover:text-accent"
            >
              <CreditCard className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Billing</span>
            </Link>
            <NotificationBell initialCount={unreadCount} dropdownDirection="down" />
            <LogoutButton />
          </div>
        </nav>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <header className="py-10">
              {eyebrow ? (
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
              ) : null}
              <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{title}</h1>
                  {description ? (
                    <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-700">{description}</p>
                  ) : null}
                </div>
                {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
              </div>
            </header>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
