import { getConfig } from "@/config";

export type Email = { to: string; subject: string; text: string; html?: string };

/**
 * Send via Resend's HTTP API when RESEND_API_KEY is set; otherwise print the
 * email (including any links) to the server log so flows still work in dev.
 */
export async function sendEmail(email: Email) {
  const config = getConfig();
  if (!config.features.email) {
    console.info(
      `[email:console] To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`
    );
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.EMAIL_FROM,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });
  if (!res.ok) {
    // Don't leak provider errors to users; log for the operator.
    console.error("Resend send failed", res.status, await res.text().catch(() => ""));
    throw new Error("Email could not be sent");
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const OTP_PURPOSE = {
  "email-verification": "verify your email",
  "sign-in": "sign in",
  "forget-password": "reset your password",
  "change-email": "change your email",
} as const;

/** One-time code email (registration, sign-in, ...). Valid 10 minutes. */
export function otpEmail(opts: {
  to: string;
  otp: string;
  type: keyof typeof OTP_PURPOSE;
}): Email {
  const purpose = OTP_PURPOSE[opts.type] ?? "continue";
  const intro = `Your HIGHBREED code to ${purpose} is:`;
  const outro = "It expires in 10 minutes. Never share it with anyone — HIGHBREED staff will never ask for it.";
  return {
    to: opts.to,
    subject: `${opts.otp} is your HIGHBREED code`,
    text: `${intro}

${opts.otp}

${outro}

— HIGHBREED`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#0b2e24">
<h2 style="font-weight:600">HIGHBREED</h2>
<p>${escapeHtml(intro)}</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px;background:#eef5f1;padding:16px;border-radius:12px;text-align:center">${escapeHtml(opts.otp)}</p>
<p style="font-size:13px;color:#4b6b60">${escapeHtml(outro)}</p>
</div>`,
  };
}

/** Small branded template with one call-to-action button. */
export function actionEmail(opts: {
  to: string;
  subject: string;
  intro: string;
  cta: string;
  url: string;
  outro?: string;
}): Email {
  const outro = opts.outro ?? "If you didn't request this, you can ignore this email.";
  return {
    to: opts.to,
    subject: opts.subject,
    text: `${opts.intro}\n\n${opts.cta}: ${opts.url}\n\n${outro}\n\n— HIGHBREED`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#0b2e24">
<h2 style="font-weight:600">HIGHBREED</h2>
<p>${escapeHtml(opts.intro)}</p>
<p><a href="${escapeHtml(opts.url)}" style="display:inline-block;background:#0b5c45;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${escapeHtml(opts.cta)}</a></p>
<p style="font-size:13px;color:#4b6b60">${escapeHtml(outro)}</p>
</div>`,
  };
}
