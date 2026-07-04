import AppShell from "@/components/AppShell";
import CalendarEventsList from "@/components/CalendarEventsList";
import StatusMessage from "@/components/StatusMessage";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  await requireUser();

  return (
    <AppShell
      eyebrow="Calendar"
      title="Upcoming meetings"
      description="Prepare notes for a meeting straight from your calendar."
    >
      <div className="mx-auto mt-8 max-w-4xl space-y-6">
        <StatusMessage>
          Your calendar is used only to help you prepare meeting notes. The app does not join meetings
          automatically.
        </StatusMessage>
        <CalendarEventsList />
      </div>
    </AppShell>
  );
}
