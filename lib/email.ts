import "server-only";
import { Resend } from "resend";
import { getRequiredEnv } from "@/lib/env";

let client: Resend | null = null;

function getResendClient() {
  client ??= new Resend(getRequiredEnv("RESEND_API_KEY"));
  return client;
}

export async function sendWorkspaceInviteEmail(options: {
  to: string;
  workspaceName: string;
  inviterName: string;
  inviteUrl: string;
}) {
  const resend = getResendClient();

  await resend.emails.send({
    from: "AI Meeting Note Taker <onboarding@resend.dev>",
    to: options.to,
    subject: `${options.inviterName} invited you to join ${options.workspaceName}`,
    html: `
      <p>${options.inviterName} invited you to collaborate on <strong>${options.workspaceName}</strong> in AI Meeting Note Taker.</p>
      <p><a href="${options.inviteUrl}">Accept the invite</a></p>
      <p>If you don't have an account yet, create one with this email address first, then open the link above.</p>
    `.trim()
  });
}
