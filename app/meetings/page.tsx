import Link from "next/link";
import { Mic } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import MeetingCard from "@/components/MeetingCard";
import WorkspaceCreateForm from "@/components/WorkspaceCreateForm";
import { requireUser } from "@/lib/auth";
import { getMeetings, getWorkspaces } from "@/lib/meetings";

export const dynamic = "force-dynamic";

export default async function MeetingsPage({
  searchParams
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  await requireUser();
  const { workspaceId } = await searchParams;
  const [meetings, workspaces] = await Promise.all([getMeetings(workspaceId), getWorkspaces()]);

  return (
    <main className="min-h-screen bg-paper px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-ink">Saved meetings</h1>
            <p className="mt-3 text-neutral-700">Review transcripts, summaries, decisions, and follow-ups.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/record"
              className="inline-flex w-fit items-center gap-2 rounded-md bg-accent px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#1f5f55]"
            >
              <Mic className="h-5 w-5" aria-hidden />
              Start New Meeting
            </Link>
            <LogoutButton />
          </div>
        </header>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="rounded-md border border-line bg-white p-4">
            <p className="text-sm font-semibold text-ink">View</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/meetings"
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  !workspaceId ? "border-accent bg-accent text-white" : "border-line bg-white text-ink"
                }`}
              >
                All accessible
              </Link>
              {workspaces.map((workspace) => (
                <Link
                  key={workspace.id}
                  href={`/meetings?workspaceId=${workspace.id}`}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    workspaceId === workspace.id ? "border-accent bg-accent text-white" : "border-line bg-white text-ink"
                  }`}
                >
                  {workspace.name}
                </Link>
              ))}
            </div>
          </div>
          <WorkspaceCreateForm />
        </section>

        {meetings.length > 0 ? (
          <div className="mt-8 grid gap-4">
            {meetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-md border border-dashed border-line bg-white p-8">
            <h2 className="text-xl font-semibold text-ink">No meetings yet</h2>
            <p className="mt-2 text-neutral-700">Start a recording to create your first AI-generated meeting notes.</p>
          </div>
        )}
      </div>
    </main>
  );
}
