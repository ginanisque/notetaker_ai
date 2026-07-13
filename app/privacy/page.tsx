import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const CONTACT_EMAIL = "ginanisque@gmail.com";
const LAST_UPDATED = "July 9, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="space-y-3 text-sm leading-6 text-neutral-700">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-accent">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to home
        </Link>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-ink">Privacy Policy</h1>
        <p className="mt-2 text-sm text-neutral-500">Last updated: {LAST_UPDATED}</p>

        <div className="surface mt-8 space-y-8 rounded-md p-6 sm:p-8">
          <Section title="Overview">
            <p>
              AI Meeting Note Taker ("the app") helps you record meetings, generate transcripts and AI-written
              summaries, and organize them personally or with a team. This policy explains what information the
              app collects, how it's used, and the choices you have.
            </p>
          </Section>

          <Section title="Information we collect">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Account information:</strong> your email address and name, via Supabase Auth (the
                authentication provider we use).
              </li>
              <li>
                <strong>Meeting content:</strong> audio you record through your browser, its transcript, and the
                AI-generated summary, action items, and follow-up email drafted from it.
              </li>
              <li>
                <strong>Workspace and collaboration data:</strong> workspace names, membership, invites, comments,
                tags, and action items, if you use shared workspaces.
              </li>
              <li>
                <strong>Billing information:</strong> your subscription plan and status. Payment card details are
                handled entirely by Stripe, our payment processor — we never see or store your card number.
              </li>
              <li>
                <strong>Google Calendar data (only if you connect it):</strong> see the dedicated section below.
              </li>
            </ul>
          </Section>

          <Section title="Google Calendar access">
            <p>
              If you choose to connect Google Calendar, the app requests <strong>read-only</strong> access to your
              event list (the <code>calendar.events.readonly</code> scope) — it can never create, edit, or delete
              anything on your calendar, send invites, or join meetings on your behalf.
            </p>
            <p>This access is used only to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Show your upcoming events on the app's Calendar page.</li>
              <li>
                Pre-fill a recording session (title, scheduled time, meeting link, and attendees) when you click
                "Prepare Notes" on an event.
              </li>
            </ul>
            <p>
              If you save a meeting that was prepared from a calendar event, the event's title, meeting link, and
              attendee list are stored with that meeting so you can see it came from your calendar later. Your
              Google access and refresh tokens are stored securely on our servers and are never sent to your
              browser or exposed to any client-side code. You can disconnect Google Calendar at any time from the
              Integrations page, which immediately deletes the stored tokens.
            </p>
          </Section>

          <Section title="Third-party services we use">
            <p>The app relies on a small number of service providers to function, each only for its stated purpose:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>OpenAI</strong> — transcribes recorded audio and generates meeting summaries.</li>
              <li><strong>Supabase</strong> — hosts our database, authentication, and file storage.</li>
              <li><strong>Stripe</strong> — processes subscription payments.</li>
              <li><strong>Resend</strong> — sends workspace invite emails.</li>
              <li><strong>Google</strong> — provides calendar data, only if you choose to connect it.</li>
            </ul>
          </Section>

          <Section title="Data retention">
            <p>
              Your meetings, transcripts, and summaries are kept until you delete them. Deleting a meeting moves it
              to a trash folder for 30 days (so you can recover it by mistake), after which it's permanently
              erased. Disconnecting Google Calendar immediately removes your stored access tokens.
            </p>
          </Section>

          <Section title="Data security">
            <p>
              All data is transmitted over HTTPS. Access to your data is restricted by row-level security so that
              you can only see your own meetings and the workspaces you belong to. Sensitive records — including
              Google OAuth tokens and billing identifiers — have no direct client-side database access at all;
              every read or write to them goes through an authenticated server-side check.
            </p>
          </Section>

          <Section title="Your choices">
            <ul className="list-disc space-y-2 pl-5">
              <li>Delete any meeting from its detail page (recoverable for 30 days, then permanently removed).</li>
              <li>Disconnect Google Calendar at any time from the Integrations page.</li>
              <li>Cancel a paid subscription at any time from the Billing page.</li>
              <li>
                Request a copy of your data or full account deletion by emailing{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent hover:underline">
                  {CONTACT_EMAIL}
                </a>
                .
              </li>
            </ul>
          </Section>

          <Section title="Children's privacy">
            <p>The app is not directed at children under 13, and we do not knowingly collect data from them.</p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              If this policy changes in a meaningful way, we'll update the date at the top of this page. Continued
              use of the app after a change means you accept the updated policy.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this policy or your data? Email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent hover:underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}
