import nodemailer from "nodemailer";

/**
 * Shared mailer for transactional email (invites, …). Mirrors the SMTP
 * detection in lib/auth.ts: without a real EMAIL_SERVER the message is
 * logged to the server console instead of being sent (local dev).
 */
const emailServer = process.env.EMAIL_SERVER;
export const smtpConfigured =
  !!emailServer && !emailServer.includes("example.com");

const from = process.env.EMAIL_FROM ?? "SplitStack <noreply@splitstack.app>";

/** Returns true when the email was actually sent. */
export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  if (!smtpConfigured) {
    console.log(
      `\n✉️  Email to ${to} (EMAIL_SERVER not configured):\nSubject: ${subject}\n${text}\n`,
    );
    return false;
  }
  const transporter = nodemailer.createTransport(emailServer);
  await transporter.sendMail({ from, to, subject, text });
  return true;
}
