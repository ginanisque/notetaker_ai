import Link from "next/link";
import type { ReactNode } from "react";
import { AudioLines, CreditCard, ListChecks, Mic } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

export default function AppShell({
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
  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between gap-4 rounded-md border border-line/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-ink">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent text-white">
              <AudioLines className="h-5 w-5" aria-hidden />
            </span>
            AI Meeting Note Taker
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/meetings"
              className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-[#eef2ef] hover:text-accent sm:inline-flex"
            >
              <ListChecks className="h-4 w-4" aria-hidden />
              Meetings
            </Link>
            <Link
              href="/record"
              className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-[#eef2ef] hover:text-accent sm:inline-flex"
            >
              <Mic className="h-4 w-4" aria-hidden />
              Record
            </Link>
            <Link
              href="/billing"
              className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-[#eef2ef] hover:text-accent sm:inline-flex"
            >
              <CreditCard className="h-4 w-4" aria-hidden />
              Billing
            </Link>
            <LogoutButton />
          </div>
        </nav>

        <header className="py-10">
          {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p> : null}
          <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{title}</h1>
              {description ? <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-700">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}
