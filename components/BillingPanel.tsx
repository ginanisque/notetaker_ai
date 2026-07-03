"use client";

import { useState } from "react";
import StatusMessage from "@/components/StatusMessage";
import type { BillingSummary } from "@/lib/billing";

export default function BillingPanel({ summary }: { summary: BillingSummary }) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");

  const isPro = summary.subscriptionStatus === "active";
  const usedMinutes = Math.round(summary.usedSeconds / 60);
  const capMinutes = Math.round(summary.capSeconds / 60);
  const usagePercent = Math.min(100, Math.round((summary.usedSeconds / summary.capSeconds) * 100));

  async function goToStripe(path: "checkout" | "portal") {
    setError("");
    setIsRedirecting(true);

    try {
      const response = await fetch(`/api/stripe/${path}`, { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !body.url) {
        throw new Error(body.error || "Unable to open Stripe.");
      }

      window.location.href = body.url;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to open Stripe.");
      setIsRedirecting(false);
    }
  }

  return (
    <div className="surface space-y-5 rounded-md p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">{isPro ? "Pro plan" : "Free plan"}</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">
          {isPro ? "Unlimited transcription" : `${usedMinutes} / ${capMinutes} minutes used this month`}
        </h2>
      </div>

      {!isPro ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full bg-accent" style={{ width: `${usagePercent}%` }} />
        </div>
      ) : null}

      {summary.subscriptionStatus === "past_due" ? (
        <StatusMessage tone="error">
          Your last payment failed. Update your billing details to keep Pro access.
        </StatusMessage>
      ) : null}

      <button
        type="button"
        onClick={() => goToStripe(isPro ? "portal" : "checkout")}
        disabled={isRedirecting}
        className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#1f5f55] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPro ? "Manage billing" : "Upgrade to Pro"}
      </button>

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    </div>
  );
}
