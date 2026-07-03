import Link from "next/link";
import { ListChecks, Mic } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Meeting workspace</p>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight text-ink sm:text-6xl">AI Meeting Note Taker</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-700">
            Record browser audio, transcribe it with OpenAI, generate structured notes, and save personal or workspace
            meetings online.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/record"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#1f5f55]"
            >
              <Mic className="h-5 w-5" aria-hidden />
              Start New Meeting
            </Link>
            <Link
              href="/meetings"
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-5 py-3 font-semibold text-ink shadow-sm transition hover:border-accent hover:text-accent"
            >
              <ListChecks className="h-5 w-5" aria-hidden />
              View Meetings
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-5 py-3 font-semibold text-ink shadow-sm transition hover:border-accent hover:text-accent"
            >
              Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
