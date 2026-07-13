import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ListChecks, LockKeyhole, Mic, Sparkles, Users } from "lucide-react";
import heroImage from "@/assets/ai-meeting-note-taker.png";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-6xl py-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex rounded-md border border-accent/20 bg-mist px-3 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            Meeting workspace
          </p>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-ink sm:text-6xl">AI Meeting Note Taker</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-700">
            Record browser audio, transcribe it automatically, generate structured notes, and save personal or
            workspace meetings online.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
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

        <div className="mt-14">
          <Image
            src={heroImage}
            alt="AI Meeting Note Taker showing a live transcript, AI summary, and action items"
            priority
            className="w-full rounded-xl shadow-2xl"
            sizes="(min-width: 1024px) 1152px, 100vw"
          />
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Sparkles, label: "AI summary", text: "Clear notes from raw discussion." },
            { icon: Users, label: "Workspace notes", text: "Shared context for the team." },
            { icon: LockKeyhole, label: "Private by default", text: "Users see only their meetings." }
          ].map((item) => (
            <div key={item.label} className="surface flex gap-3 rounded-md p-4">
              <item.icon className="mt-1 h-5 w-5 text-accent" aria-hidden />
              <div>
                <p className="font-semibold text-ink">{item.label}</p>
                <p className="mt-1 text-sm leading-5 text-neutral-600">{item.text}</p>
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-14 flex justify-center">
          <Link href="/privacy" className="text-sm font-medium text-neutral-500 hover:text-accent">
            Privacy Policy
          </Link>
        </footer>
      </section>
    </main>
  );
}
