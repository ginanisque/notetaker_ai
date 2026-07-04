export type BillingInterval = "monthly" | "annual";

// Mirrors the tiered/graduated pricing configured in Stripe (see README) —
// keep these two in sync if the plan's pricing ever changes. This function
// is for display previews only; Stripe is the source of truth for billing.
const TEAM_PLAN_RATES: Record<BillingInterval, { base: number; perExtraSeat: number }> = {
  monthly: { base: 15, perExtraSeat: 4 },
  annual: { base: 144, perExtraSeat: 38.4 }
};
const INCLUDED_SEATS = 5;

export function computeTeamPlanPrice(seatCount: number, interval: BillingInterval): number {
  const { base, perExtraSeat } = TEAM_PLAN_RATES[interval];
  const extraSeats = Math.max(0, seatCount - INCLUDED_SEATS);
  return base + extraSeats * perExtraSeat;
}
