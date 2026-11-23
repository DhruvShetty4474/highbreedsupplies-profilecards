import { getConfig } from "@/config";

export type Email = { to: string; subject: string; text: string; html?: string };

/**
 * Sends through the Gmail API as the configured Gmail account
 * (GMAIL_* keys) or, if those are absent, Resend (RESEND_API_KEY).
 * With neither, the email is printed to the server log so flows still work
 * in development (`npm run dev` terminal / `npx wrangler tail`).
 */
export async function sendEmail(email: Email) {
  const config = getConfig();
  if (config.features.gmail) return sendViaGmail(email);
  if (config.RESEND_API_KEY) return sendViaResend(email);
  console.info(
    `[email:console] To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`
  );
}

// ---------------------------------------------------------------------------
// Gmail API (HTTPS only, works on Workers — no SMTP)
// ---------------------------------------------------------------------------
let gmailToken: { refresh: string; value: string; expiresAt: number } | null = null;

async function gmailAccessToken() {
  const c = getConfig();
  const cached = gmailToken;
  if (cached && cached.refresh === c.GMAIL_REFRESH_TOKEN && cached.expiresAt > Date.now() + 60_000) {
    return cached.value;
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.GMAIL_CLIENT_ID!,
      client_secret: c.GMAIL_CLIENT_SECRET!,
      refresh_token: c.GMAIL_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    // invalid_grant = refresh token revoked/expired → run `npm run gmail:auth` again.
    console.error("Gmail token refresh failed", res.status, await res.text().catch(() => ""));
    throw new Error("Email could not be sent");
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  gmailToken = {
    refresh: c.GMAIL_REFRESH_TOKEN!,
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return gmailToken.value;
}

function utf8Base64(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/** Wrap base64 at 76 chars (RFC 2045). */
function wrap76(b64: string) {
  return b64.replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

/** RFC 2047 encoded header word, for non-ASCII subjects / names. */
function encodeHeader(s: string) {
  return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${utf8Base64(s)}?=`;
}

/** multipart/alternative MIME message (text + HTML). Exported for tests. */
export function buildMime(from: string, email: Email) {
  const boundary = `hb_${crypto.randomUUID().replace(/-/g, "")}`;
  const parts = [
    `From: ${from}`,
    `To: ${email.to}`,
    `Subject: ${encodeHeader(email.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(utf8Base64(email.text)),
  ];
  if (email.html) {
    parts.push(
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      wrap76(utf8Base64(email.html))
    );
  }
  parts.push(`--${boundary}--`, "");
  return parts.join("\r\n");
}

async function sendViaGmail(email: Email) {
  const raw = utf8Base64(buildMime(getConfig().EMAIL_FROM, email))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await gmailAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    console.error("Gmail send failed", res.status, await res.text().catch(() => ""));
    throw new Error("Email could not be sent");
  }
}

async function sendViaResend(email: Email) {
  const config = getConfig();
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

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const BRAND = {
  forest: "#0B5C45",
  deep: "#062E24",
  gold: "#D4A017",
  ink: "#10231C",
  muted: "#4B6B60",
  mist: "#EEF5F1",
  line: "#E2EAE5",
};

/**
 * Shared email layout: table-based with inline styles so it renders the same
 * in Gmail, Outlook and Apple Mail, light or dark.
 */
function layout(opts: { preheader: string; heading: string; subheading?: string; body: string }) {
  const site = getConfig().APP_URL.replace(/^https?:\/\//, "");
  const year = new Date().getFullYear();
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:#EEF3F0;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(opts.preheader)}&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF3F0;">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;font-family:${font};">
    <!-- Brand -->
    <tr><td align="center" style="padding:0 0 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" valign="middle" width="40" height="40" style="width:40px;height:40px;background:${BRAND.deep};border-radius:12px;font-size:20px;font-weight:800;color:${BRAND.gold};font-family:${font};">H</td>
        <td style="padding-left:10px;text-align:left;">
          <div style="font-size:16px;font-weight:800;letter-spacing:2px;color:${BRAND.deep};line-height:1.1;">HIGHBREED</div>
          <div style="font-size:9px;font-weight:600;letter-spacing:3px;color:${BRAND.gold};line-height:1.4;">SUPPLIES</div>
        </td>
      </tr></table>
    </td></tr>
    <!-- Card -->
    <tr><td style="background:#ffffff;border-radius:20px;border:1px solid ${BRAND.line};overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="height:6px;line-height:6px;font-size:0;background:${BRAND.gold};border-radius:20px 20px 0 0;">&nbsp;</td></tr>
        <tr><td align="center" style="padding:32px 24px 4px;">
          <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:800;color:${BRAND.ink};text-align:center;">${escapeHtml(opts.heading)}</h1>
          ${opts.subheading ? `<p style="margin:8px 0 0;font-size:15px;line-height:1.55;color:${BRAND.muted};text-align:center;">${opts.subheading}</p>` : ""}
        </td></tr>
        <tr><td style="padding:20px 24px 28px;">${opts.body}</td></tr>
      </table>
    </td></tr>
    <!-- Footer -->
    <tr><td align="center" style="padding:20px 16px 0;font-size:12px;line-height:1.7;color:${BRAND.muted};text-align:center;">
      This is an automated message — please don't reply.<br>
      <a href="https://${escapeHtml(site)}" style="color:${BRAND.forest};text-decoration:none;font-weight:700;">${escapeHtml(site)}</a>
      &nbsp;·&nbsp; © ${year} HIGHBREED SUPPLIES
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

const p = (html: string, align: "left" | "center" = "left") =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${BRAND.ink};text-align:${align};">${html}</p>`;

const OTP_PURPOSE = {
  "email-verification": { heading: "Verify your email", action: "finish creating your account" },
  "sign-in": { heading: "Your sign-in code", action: "sign in" },
  "forget-password": { heading: "Reset your password", action: "reset your password" },
  "change-email": { heading: "Confirm your new email", action: "change your email" },
} as const;

/** The code as one box per digit: centred, never wraps, readable on any phone. */
function codeBoxes(otp: string) {
  const cells = otp
    .split("")
    .map(
      (d, i) =>
        (i ? `<td width="8" style="width:8px;font-size:0;">&nbsp;</td>` : "") +
        `<td align="center" valign="middle" width="42" height="54" style="width:42px;height:54px;background:${BRAND.mist};border:1px solid #CFE0D7;border-radius:10px;font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:28px;font-weight:800;color:${BRAND.deep};text-align:center;">${escapeHtml(d)}</td>`
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>${cells}</tr></table>`;
}

/** One-time code email (registration, sign-in, ...). Valid 10 minutes. */
export function otpEmail(opts: {
  to: string;
  otp: string;
  type: keyof typeof OTP_PURPOSE;
}): Email {
  const purpose = OTP_PURPOSE[opts.type] ?? { heading: "Your code", action: "continue" };
  const body =
    codeBoxes(opts.otp) +
    `<p style="margin:14px 0 0;font-size:13px;line-height:1.5;color:${BRAND.muted};text-align:center;">
      Code: <strong style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:15px;letter-spacing:1px;color:${BRAND.ink};">${escapeHtml(opts.otp)}</strong>
      &nbsp;·&nbsp; expires in <strong style="color:${BRAND.ink};">10 minutes</strong>
    </p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
      <tr><td style="background:#FFF8E6;border:1px solid #F3DFA6;border-radius:12px;padding:14px 16px;font-size:13px;line-height:1.55;color:#5C4A12;">
        <strong>Never share this code.</strong> HIGHBREED staff and managers will never ask you for it.
      </td></tr>
    </table>` +
    `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:${BRAND.muted};text-align:center;">Didn't ask for this? You can safely ignore this email — nothing changes without the code.</p>`;

  return {
    to: opts.to,
    subject: `${opts.otp} is your HIGHBREED code`,
    text:
      `${purpose.heading}\n\nUse this code to ${purpose.action}: ${opts.otp}\n\n` +
      `It expires in 10 minutes. Never share it — HIGHBREED staff will never ask for it.\n` +
      `Didn't ask for this? Ignore this email.\n\n— HIGHBREED SUPPLIES`,
    html: layout({
      preheader: `${opts.otp} is your code to ${purpose.action}. It expires in 10 minutes.`,
      heading: purpose.heading,
      subheading: `Enter this code to ${escapeHtml(purpose.action)}.`,
      body,
    }),
  };
}

/** Email with one call-to-action button (e.g. password reset link). */
export function actionEmail(opts: {
  to: string;
  subject: string;
  intro: string;
  cta: string;
  url: string;
  outro?: string;
}): Email {
  const outro = opts.outro ?? "If you didn't request this, you can ignore this email.";
  const body =
    p(escapeHtml(opts.intro), "center") +
    `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 22px;"><tr>
      <td style="border-radius:10px;background:${BRAND.forest};">
        <a href="${escapeHtml(opts.url)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(opts.cta)}</a>
      </td></tr></table>` +
    `<p style="margin:0 0 12px;font-size:12px;line-height:1.6;color:${BRAND.muted};word-break:break-all;">Button not working? Paste this link into your browser:<br>${escapeHtml(opts.url)}</p>` +
    `<p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.muted};">${escapeHtml(outro)}</p>`;
  return {
    to: opts.to,
    subject: opts.subject,
    text: `${opts.intro}\n\n${opts.cta}: ${opts.url}\n\n${outro}\n\n— HIGHBREED SUPPLIES`,
    html: layout({ preheader: opts.intro, heading: opts.subject, body }),
  };
}
