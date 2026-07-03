import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { acceptWorkspaceInvite, getInviteById } from "@/lib/workspace-invites";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const invite = await getInviteById(id);

  if (!invite) {
    redirect("/meetings");
  }

  let accepted = false;
  let error = "";

  try {
    await acceptWorkspaceInvite(id);
    accepted = true;
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Unable to accept invite.";
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg flex-col justify-center">
        <section className="surface rounded-md p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-accent" aria-hidden />
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
            {accepted ? "Workspace joined" : "Invite could not be accepted"}
          </h1>
          <p className="mt-3 leading-7 text-neutral-700">
            {accepted
              ? `You now have access to ${invite.workspaceName ?? "this workspace"}.`
              : error}
          </p>
          <Link
            href={`/meetings?workspaceId=${invite.workspaceId}`}
            className="mt-6 inline-flex rounded-md bg-accent px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#1f5f55]"
          >
            Open workspace
          </Link>
        </section>
      </div>
    </main>
  );
}
