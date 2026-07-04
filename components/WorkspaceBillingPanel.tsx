"use client";

import { useState } from "react";
import StatusMessage from "@/components/StatusMessage";
import { computeTeamPlanPrice, type BillingInterval } from "@/lib/team-pricing";
import type { WorkspaceBillingSummary } from "@/lib/workspace-billing";

export default function WorkspaceBillingPanel({
  workspaceId,
  isOwner,
  summary
}: {
  workspaceId: string;
  isOwner: boolean;
  summary: WorkspaceBillingSummary;
}) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");

  const isTeam = summary.subscriptionStatus === "active";
  const previewPrice = computeTeamPlanPrice(summary.seatCount, interval);

  async function goToStripe(path: "checkout" | "portal") {
    setError("");
    setIsRedirecting(true);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/stripe/${path}`, {
        method: "POST",
        headers: path === "checkout" ? { "Content-Type": "application/json" } : undefined,
        body: path === "checkout" ? JSON.stringify({ interval }) : undefined
      });
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
    <div className="surface space-y-4 rounded-md p-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">{isTeam ? "Team plan" : "Free plan"}</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">
          {summary.seatCount} {summary.seatCount === 1 ? "seat" : "seats"}
          {isTeam ? ` · billed ${summary.billingInterval ?? "monthly"}` : null}
        </h2>
      </div>

      {summary.subscriptionStatus === "past_due" ? (
        <StatusMessage tone="error">
          The last payment for this workspace failed. Update billing details to keep Team access.
        </StatusMessage>
      ) : null}

      {!isTeam ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md border border-line bg-white p-1">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={`rounded px-3 py-1.5 text-sm font-semibold ${
                interval === "monthly" ? "bg-accent text-white" : "text-ink"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("annual")}
              className={`rounded px-3 py-1.5 text-sm font-semibold ${
                interval === "annual" ? "bg-accent text-white" : "text-ink"
              }`}
            >
              Annual (20% off)
            </button>
          </div>
          <p className="text-sm text-neutral-600">
            ${previewPrice.toFixed(2)}/{interval === "annual" ? "year" : "month"} for {summary.seatCount}{" "}
            {summary.seatCount === 1 ? "seat" : "seats"}
          </p>
        </div>
      ) : null}

      {isOwner ? (
        <button
          type="button"
          onClick={() => goToStripe(isTeam ? "portal" : "checkout")}
          disabled={isRedirecting}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#1f5f55] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isTeam ? "Manage billing" : "Upgrade to Team"}
        </button>
      ) : (
        <p className="text-sm text-neutral-500">Only the workspace owner can manage billing.</p>
      )}

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    </div>
  );
}
