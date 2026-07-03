import Link from "next/link";
import { LayoutDashboard, Mic } from "lucide-react";
import AppShell from "@/components/AppShell";
import MeetingCard from "@/components/MeetingCard";
import MeetingSearch from "@/components/MeetingSearch";
import WorkspaceInvitePanel from "@/components/WorkspaceInvitePanel";
import WorkspaceCreateForm from "@/components/WorkspaceCreateForm";
import { requireUser } from "@/lib/auth";
import { getMeetings, getWorkspaces } from "@/lib/meetings";

export const dynamic = "force-dynamic";

export default async function MeetingsPage({
  searchParams
}: {
  searchParams: Promise<{ workspaceId?: string; q?: string; tag?: string }>;
}) {
  await requireUser();
  const { workspaceId, q, tag } = await searchParams;
  const [allMeetings, workspaces] = await Promise.all([getMeetings(workspaceId), getWorkspaces()]);
  const selectedWorkspace = workspaceId ? workspaces.find((workspace) => workspace.id === workspaceId) : null;
  const query = q?.trim().toLowerCase() ?? "";
  const meetings = (query
    ? allMeetings.filter((meeting) =>
        [meeting.title, meeting.summary.shortSummary, meeting.transcript].some((value) =>
          value.toLowerCase().includes(query)
        )
      )
    : allMeetings
  ).filter((meeting) => (tag ? meeting.tags?.some((item) => item.name === tag) : true));

  return (
    <AppShell
      eyebrow="Workspace"
      title="Saved meetings"
      description="Review transcripts, summaries, decisions, and follow-ups."
      actions={
        <Link
          href="/record"
          className="inline-flex w-fit items-center gap-2 rounded-md bg-accent px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#1f5f55]"
        >
          <Mic className="h-5 w-5" aria-hidden />
          Start New Meeting
        </Link>
      }
    >
        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="surface rounded-md p-4">
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

        <div className="mt-5">
          <MeetingSearch />
        </div>

        {selectedWorkspace ? (
          <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_24rem]">
            <div className="rounded-md border border-accent/20 bg-mist px-6 py-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Workspace</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{selectedWorkspace.name}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  Shared meeting notes and action items saved to this workspace will be visible to workspace members.
                </p>
              </div>
              <Link
                href={`/record?workspaceId=${selectedWorkspace.id}`}
                className="inline-flex w-fit items-center gap-2 rounded-md bg-accent px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#1f5f55]"
              >
                <Mic className="h-5 w-5" aria-hidden />
                Record in {selectedWorkspace.name}
              </Link>
              <Link
                href={`/workspaces/${selectedWorkspace.id}`}
                className="inline-flex w-fit items-center gap-2 rounded-md border border-accent/30 bg-white px-4 py-3 font-semibold text-accent shadow-sm transition hover:border-accent"
              >
                <LayoutDashboard className="h-5 w-5" aria-hidden />
                Dashboard
              </Link>
            </div>
            </div>
            <WorkspaceInvitePanel workspaceId={selectedWorkspace.id} />
          </section>
        ) : null}

        {tag ? (
          <p className="mt-5 text-sm text-neutral-600">
            Filtered by tag: <span className="font-semibold text-ink">{tag}</span>
          </p>
        ) : null}

        {meetings.length > 0 ? (
          <div className="mt-8 grid gap-4">
            {meetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-md border border-dashed border-line bg-white/85 p-8 text-center">
            <h2 className="text-xl font-semibold text-ink">No meetings yet</h2>
            <p className="mt-2 text-neutral-700">Start a recording to create your first AI-generated meeting notes.</p>
          </div>
        )}
    </AppShell>
  );
}
