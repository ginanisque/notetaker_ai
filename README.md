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

## Team Workflow

- Create a workspace from `/meetings`.
- Select the workspace to reveal the workspace banner and team access panel.
- Invite a member by email, copy the generated invite link, and send it manually.
- The invitee signs up/logs in and opens the invite link to join the workspace.
- Workspace members can view shared meeting notes.
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
```

4. Deploy.

The OpenAI key and Supabase service role key are only used server-side. Do not expose them in client components.

## Checks

```bash
npm run typecheck
npm run build
npm audit --omit=dev
```
