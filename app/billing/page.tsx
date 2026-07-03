import AppShell from "@/components/AppShell";
import BillingPanel from "@/components/BillingPanel";
import { requireUser } from "@/lib/auth";
import { getBillingSummary } from "@/lib/billing";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  await requireUser();
  const summary = await getBillingSummary();

  return (
    <AppShell eyebrow="Account" title="Billing" description="Manage your plan and see this month's usage.">
      <div className="mx-auto max-w-2xl">
        <BillingPanel summary={summary} />
      </div>
    </AppShell>
  );
}
