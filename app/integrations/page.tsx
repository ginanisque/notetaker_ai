import Link from "next/link";
import AppShell from "@/components/AppShell";
import GoogleConnectionPanel from "@/components/GoogleConnectionPanel";
import StatusMessage from "@/components/StatusMessage";
import { requireUser } from "@/lib/auth";
import { getConnectionStatus } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const user = await requireUser();
  const { error, connected } = await searchParams;
  const isConnected = await getConnectionStatus(user.id);

  return (
    <AppShell
      eyebrow="Settings"
      title="Integrations"
      description="Connect other tools to help prepare your meeting notes."
    >
      <div className="mx-auto mt-8 max-w-2xl space-y-4">
        {connected === "true" ? <StatusMessage tone="success">Google Calendar connected.</StatusMessage> : null}
        {error ? (
          <StatusMessage tone="error">Unable to connect Google Calendar. Please try again.</StatusMessage>
        ) : null}

        <GoogleConnectionPanel isConnected={isConnected} />

        <StatusMessage>
          Your calendar is used only to help you prepare meeting notes. The app does not join meetings
          automatically, send invites, or edit your calendar. We request read-only access to your event list. Read
          the full{" "}
          <Link href="/privacy" className="font-semibold text-accent hover:underline">
            Privacy Policy
          </Link>
          .
        </StatusMessage>
      </div>
    </AppShell>
  );
}
