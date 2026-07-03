import Link from "next/link";
import AppShell from "@/components/AppShell";
import ActionItemsTable from "@/components/ActionItemsTable";
import { requireUser } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceMembers } from "@/lib/workspace-invites";
import { getWorkspaceActionItems, getWorkspaceById } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

export default async function WorkspaceTasksPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireUser();
  const user = await getCurrentUser();
  const { id } = await params;
  const { filter = "all" } = await searchParams;
  const [workspace, members, allItems] = await Promise.all([
    getWorkspaceById(id),
    getWorkspaceMembers(id),
    getWorkspaceActionItems(id)
  ]);

  const now = new Date();
  const items = allItems.filter((item) => {
    if (filter === "open") return item.status === "open";
    if (filter === "in_progress") return item.status === "in_progress";
    if (filter === "done") return item.status === "done";
    if (filter === "assigned") return item.assignedUserId === user?.id || item.ownerEmail === user?.email;
    if (filter === "overdue") {
      const deadline = Date.parse(item.deadline);
      return item.status !== "done" && !Number.isNaN(deadline) && new Date(deadline) < now;
    }
    return true;
  });

  const filters = [
    ["all", "All"],
    ["open", "Open"],
    ["in_progress", "In progress"],
    ["done", "Done"],
    ["assigned", "Assigned to me"],
    ["overdue", "Overdue"]
  ];

  return (
    <AppShell
      eyebrow="Tasks"
      title={`${workspace?.name ?? "Workspace"} tasks`}
      description="Action items from meetings in this workspace."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map(([value, label]) => (
          <Link
            key={value}
            href={`/workspaces/${id}/tasks?filter=${value}`}
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${
              filter === value ? "border-accent bg-accent text-white" : "border-line bg-white text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      <ActionItemsTable items={items} members={members} />
    </AppShell>
  );
}
