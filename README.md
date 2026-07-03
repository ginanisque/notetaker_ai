# AI Meeting Note Taker

Production-ready SaaS MVP for recording meetings, transcribing audio with OpenAI, generating structured notes, and saving personal or workspace meetings in Supabase.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.local.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
CRON_SECRET=
```

3. In Supabase, run the SQL files in `supabase/migrations/` in order.

4. Start development:

```bash
npm run dev
```

If your local Node install cannot verify your network certificate chain, use the local-only workaround:

```bash
npm run dev:insecure-tls
```

Do not use that workaround in production.

## Supabase

Create a Supabase project, keep Data API enabled, and run the SQL migration. The migration creates:

- `profiles`
- `workspaces`
- `workspace_members`
- `meetings`
- `action_items`

It also enables Row Level Security so users can only access their personal meetings and workspace meetings where they are members.

Additional migrations add meeting-session coordination, duplicate merge support, and workspace invite links.
Later migrations add direct member management, comments, tags, and richer action item editing.
Migrations `007`-`010` add Stripe billing columns, monthly usage tracking, API rate limiting, and a private Storage bucket for recorded audio.
Migration `011` adds a 30-day trash for meetings.

## Billing, usage, and rate limiting

- Free-tier accounts get 60 transcription minutes/month; the cap is enforced server-side in `/api/transcribe` before each OpenAI call. Subscribing to Pro (via Stripe Checkout, from `/billing`) removes the cap.
- `/api/transcribe` and `/api/summarize` are also rate-limited per user (a Supabase-backed sliding window) to prevent runaway API costs from scripted abuse.
- Recorded audio is uploaded to a private Supabase Storage bucket (`meeting-audio`) and played back on the meeting detail page via a short-lived signed URL.
- Workspace invites send a real email via Resend in addition to the copyable invite link already shown in the UI. The default sender (`onboarding@resend.dev`) is a sandbox address — verify your own domain in Resend before relying on this for production deliverability.

### Local Stripe webhook testing

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward test-mode webhook events to your local server:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the signing secret it prints into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

## Meeting trash

- The meeting owner can move a meeting to trash from its detail page; it's excluded from the meeting list, workspace dashboards, and duplicate detection, but the owner can still open it directly to review or restore it.
- Trashed meetings are permanently deleted 30 days after being trashed. A daily Vercel Cron job (`vercel.json`, `/api/cron/purge-trash`) does the actual purge — set `CRON_SECRET` as a project env var in Vercel and Vercel will automatically send it as the `Authorization: Bearer` header on each cron invocation.
- Locally, there's no cron running — trigger a purge manually with:

```bash
curl -H "Authorization: Bearer <your CRON_SECRET>" http://localhost:3000/api/cron/purge-trash
```

## Team Workflow

- Create a workspace from `/meetings`.
- Select the workspace to reveal the workspace banner and team access panel.
- Invite a member by email, copy the generated invite link, and send it manually.
- Add an existing user to the workspace by email. If the user does not exist, ask them to create an account first.
- Workspace members can view shared meeting notes.
- Workspace members can comment on meeting follow-up.
- Action items can be assigned to members, moved between open/in-progress/done, and edited for deadline.
- Workspace task dashboards live at `/workspaces/[id]/tasks`.
- Workspace overview dashboards live at `/workspaces/[id]`.
- Meetings can be tagged and searched.
- If two people record the same meeting, the detail page can suggest likely duplicates and merge notes.
- Meeting notes can be copied, opened as a prefilled email, or downloaded as Markdown.

## Vercel Deployment

1. Push the project to GitHub.
2. Create a Vercel project from the repository.
3. Add these environment variables in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
CRON_SECRET=
```

4. In Stripe, create a webhook endpoint pointing at `https://<your-domain>/api/stripe/webhook` listening for `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`, then copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

5. Deploy. Vercel will pick up `vercel.json` and start running the daily trash-purge cron automatically once `CRON_SECRET` is set.

The OpenAI key, Stripe secret key, Resend key, and Supabase service role key are only used server-side. Do not expose them in client components.

## Checks

```bash
npm run typecheck
npm run build
npm audit --omit=dev
```
