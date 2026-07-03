import Link from "next/link";
import { ArrowRight, ListChecks, LockKeyhole, Mic, Sparkles, Users } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_26rem]">
        <div>
          <p className="inline-flex rounded-md border border-accent/20 bg-mist px-3 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            Meeting workspace
          </p>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-ink sm:text-6xl">
            AI Meeting Note Taker
          </h1>
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
              <ArrowRight className="h-4 w-4" aria-hidden />
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
        <div className="surface rounded-md p-5">
          <div className="rounded-md bg-ink p-5 text-white">
            <p className="text-sm font-semibold text-white/70">Today&apos;s meeting</p>
            <h2 className="mt-2 text-2xl font-semibold">Product sync</h2>
            <p className="mt-4 text-sm leading-6 text-white/75">
              Transcription, decisions, action items, and a follow-up email are prepared after recording.
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {[
              { icon: Sparkles, label: "AI summary", text: "Clear notes from raw discussion." },
              { icon: Users, label: "Workspace notes", text: "Shared context for the team." },
              { icon: LockKeyhole, label: "Private by default", text: "Users see only their meetings." }
            ].map((item) => (
              <div key={item.label} className="flex gap-3 rounded-md border border-line bg-white p-4">
                <item.icon className="mt-1 h-5 w-5 text-accent" aria-hidden />
                <div>
                  <p className="font-semibold text-ink">{item.label}</p>
                  <p className="mt-1 text-sm leading-5 text-neutral-600">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
