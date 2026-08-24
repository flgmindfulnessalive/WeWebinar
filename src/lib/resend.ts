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
  // The SDK resolves with { data, error } instead of rejecting on API-side
  // failures (invalid_from_address, validation_error, quota exceeded,
  // etc.) -- without this check a rejected send looks identical to a
  // successful one to every caller, so nothing gets logged and no email
  // arrives, with no trace anywhere.
  const result = await getResendClient().emails.send({ from, to, subject, html });
  if (result.error) {
    throw new Error(`Resend: ${result.error.name} - ${result.error.message}`);
  }
  return result;
}
