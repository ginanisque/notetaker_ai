import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Recorder from "@/components/Recorder";
import LogoutButton from "@/components/LogoutButton";
import { requireUser } from "@/lib/auth";
import { getWorkspaces } from "@/lib/meetings";

export const dynamic = "force-dynamic";

export default async function RecordPage() {
  await requireUser();
  const workspaces = await getWorkspaces();

  return (
    <main className="min-h-screen bg-paper px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-accent">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Home
          </Link>
          <LogoutButton />
        </div>
        <header className="mt-8">
          <h1 className="text-4xl font-semibold tracking-tight text-ink">Record meeting</h1>
          <p className="mt-3 text-neutral-700">Capture the discussion and turn it into structured meeting notes.</p>
        </header>
        <section className="mt-8">
          <Recorder workspaces={workspaces} />
        </section>
      </div>
    </main>
  );
}
