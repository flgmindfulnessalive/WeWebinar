import { Resend } from "resend";

// Constructed lazily (not at module load) so a missing RESEND_API_KEY
// doesn't crash `next build` while it statically evaluates every route
// module — the Resend SDK throws eagerly in its constructor.
let resendClient: Resend | null = null;

function getResendClient() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not configured");
  }
  return getResendClient().emails.send({ from, to, subject, html });
}
