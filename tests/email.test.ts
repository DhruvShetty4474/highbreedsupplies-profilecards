import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMime, otpEmail, sendEmail } from "@/lib/email";

const GMAIL = {
  GMAIL_CLIENT_ID: "cid.apps.googleusercontent.com",
  GMAIL_CLIENT_SECRET: "csecret",
  GMAIL_REFRESH_TOKEN: "1//refresh",
};

afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of Object.keys(GMAIL)) delete process.env[k];
});

function decodePart(mime: string, type: string) {
  const start = mime.indexOf(`Content-Type: ${type}`);
  const body = mime.slice(start).split("\r\n\r\n")[1].split("\r\n--")[0];
  return Buffer.from(body.replace(/\r\n/g, ""), "base64").toString("utf8");
}

describe("OTP email template", () => {
  it("has the code, expiry and a safety note in both text and HTML", () => {
    const e = otpEmail({ to: "a@example.com", otp: "482913", type: "email-verification" });
    expect(e.subject).toBe("482913 is your HIGHBREED code");
    expect(e.text).toContain("482913");
    expect(e.text).toContain("10 minutes");
    expect(e.html).toContain("4 8 2 9 1 3");
    expect(e.html).toContain("Verify your email");
    expect(e.html).toContain("Never share this code");
    expect(e.html).toContain("HIGHBREED");
  });
});

describe("Gmail API sender", () => {
  it("builds a valid multipart MIME message", () => {
    const mime = buildMime("HIGHBREED SUPPLIES <highbreedsuppliesotp56@gmail.com>", {
      to: "a@example.com",
      subject: "Code — ✓",
      text: "Hello ₹",
      html: "<p>Hello ₹</p>",
    });
    expect(mime).toContain("From: HIGHBREED SUPPLIES <highbreedsuppliesotp56@gmail.com>");
    expect(mime).toMatch(/Subject: =\?UTF-8\?B\?.+\?=/);
    expect(decodePart(mime, "text/plain")).toBe("Hello ₹");
    expect(decodePart(mime, "text/html")).toBe("<p>Hello ₹</p>");
  });

  it("refreshes an access token and sends as the Gmail account", async () => {
    Object.assign(process.env, GMAIL);
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      if (String(url).includes("oauth2.googleapis.com/token")) {
        return new Response(JSON.stringify({ access_token: "ya29.token", expires_in: 3600 }));
      }
      return new Response(JSON.stringify({ id: "msg1" }));
    });

    await sendEmail(otpEmail({ to: "cust@example.com", otp: "123456", type: "sign-in" }));

    expect(calls[0].url).toBe("https://oauth2.googleapis.com/token");
    expect(String(calls[0].init?.body)).toContain("refresh_token=1%2F%2Frefresh");
    const send = calls[calls.length - 1];
    expect(send.url).toBe("https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    expect(new Headers(send.init?.headers).get("authorization")).toBe("Bearer ya29.token");
    const raw = JSON.parse(String(send.init?.body)).raw as string;
    expect(raw).not.toMatch(/[+/=]/); // base64url
    const mime = Buffer.from(raw, "base64url").toString("utf8");
    expect(mime).toContain("From: HIGHBREED SUPPLIES <highbreedsuppliesotp56@gmail.com>");
    expect(mime).toContain("To: cust@example.com");
    expect(decodePart(mime, "text/html")).toContain("1 2 3 4 5 6");
  });

  it("throws (without leaking details) when Gmail rejects the send", async () => {
    Object.assign(process.env, GMAIL, { GMAIL_REFRESH_TOKEN: "1//other" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", async (url: string) =>
      String(url).includes("/token")
        ? new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })
        : new Response("{}")
    );
    await expect(
      sendEmail(otpEmail({ to: "x@example.com", otp: "000111", type: "sign-in" }))
    ).rejects.toThrow("Email could not be sent");
  });
});
