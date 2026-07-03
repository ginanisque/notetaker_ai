import "server-only";
import Stripe from "stripe";
import { getRequiredEnv } from "@/lib/env";

let client: Stripe | null = null;

export function getStripeClient() {
  client ??= new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
  return client;
}
