import Link from "next/link";
import { ClipboardList, Mic, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import MeetingCard from "@/components/MeetingCard";
import WorkspaceInvitePanel from "@/components/WorkspaceInvitePanel";
import { requireUser } from "@/lib/auth";
import { getWorkspaceDashboard } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

export default async function WorkspaceDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const dashboard = await getWorkspaceDashboard(id);

  if (!dashboard.workspace) {
    return null;
  }

  return (
    <AppShell
      eyebrow="Workspace dashboard"
      title={dashboard.workspace.name}
      description="Recent meetings, team members, and open follow-up work."
      actions={
        <>
          <Link
            href={`/record?workspaceId=${id}`}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 font-semibold text-white"
          >
            <Mic className="h-5 w-5" aria-hidden />
            New Meeting
          </Link>
          <Link
            href={`/workspaces/${id}/tasks`}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 font-semibold text-ink"
          >
            <ClipboardList className="h-5 w-5" aria-hidden />
            View Tasks
          </Link>
        </>
      }
    >
      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface rounded-md p-5">
          <p className="text-sm text-neutral-600">Open action items</p>
          <p className="mt-2 text-3xl font-semibold">{dashboard.openActionItems.length}</p>
        </div>
        <div className="surface rounded-md p-5">
          <p className="text-sm text-neutral-600">Overdue</p>
          <p className="mt-2 text-3xl font-semibold">{dashboard.overdueActionItems.length}</p>
        </div>
        <div className="surface rounded-md p-5">
          <p className="inline-flex items-center gap-2 text-sm text-neutral-600">
            <Users className="h-4 w-4" aria-hidden />
            Members
          </p>
          <p className="mt-2 text-3xl font-semibold">{dashboard.members.length}</p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div>
          <h2 className="text-xl font-semibold text-ink">Recent meetings</h2>
          <div className="mt-4 grid gap-4">
            {dashboard.recentMeetings.length ? (
              dashboard.recentMeetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} />)
            ) : (
              <div className="rounded-md border border-dashed border-line bg-white/85 p-8 text-center">
                No meetings in this workspace yet.
              </div>
            )}
          </div>
        </div>
        <WorkspaceInvitePanel workspaceId={id} />
      </section>
    </AppShell>
  );
}
