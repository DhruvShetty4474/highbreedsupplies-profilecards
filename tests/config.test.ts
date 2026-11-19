import { describe, expect, it } from "vitest";
import { parseConfig } from "@/config";

const SECRET = "x".repeat(32);

describe("config", () => {
  it("names every missing required variable", () => {
    expect(() => parseConfig({})).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => parseConfig({ BETTER_AUTH_SECRET: "short" })).toThrow(/at least 32/);
    expect(() => parseConfig({ BETTER_AUTH_SECRET: SECRET, APP_URL: "not a url" })).toThrow(/APP_URL/);
  });

  it("R2 is all-or-nothing", () => {
    const err = (() => {
      try {
        parseConfig({ BETTER_AUTH_SECRET: SECRET, R2_ACCOUNT_ID: "acc" });
      } catch (e) {
        return (e as Error).message;
      }
    })();
    expect(err).toMatch(/R2_ACCESS_KEY_ID/);
    expect(err).toMatch(/R2_SECRET_ACCESS_KEY/);
  });

  it("optional services switch off without keys", () => {
    const c = parseConfig({ BETTER_AUTH_SECRET: SECRET, SENTRY_DSN: "" });
    expect(c.features).toEqual({
      media: false,
      email: false,
      gmail: false,
      sentry: false,
      google: false,
      razorpay: false,
    });
    expect(() =>
      parseConfig({ BETTER_AUTH_SECRET: SECRET, GOOGLE_CLIENT_ID: "id-only" })
    ).toThrow(/GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET/);
    expect(() =>
      parseConfig({ BETTER_AUTH_SECRET: SECRET, RAZORPAY_KEY_ID: "rzp_test_x" })
    ).toThrow(/RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET/);
    expect(() =>
      parseConfig({ BETTER_AUTH_SECRET: SECRET, GMAIL_CLIENT_ID: "id-only" })
    ).toThrow(/GMAIL_REFRESH_TOKEN is required/);
    expect(c.EMAIL_FROM).toBe("HIGHBREED SUPPLIES <highbreedsuppliesotp56@gmail.com>");
    expect(c.MEDIA_QUOTA_MB_PER_USER).toBe(100);
    // Email OTP verification is on unless explicitly turned off.
    expect(c.REQUIRE_EMAIL_VERIFICATION).toBe(true);
  });

  it("parses admin emails and trims the app URL", () => {
    const c = parseConfig({
      BETTER_AUTH_SECRET: SECRET,
      APP_URL: "https://highfis.com/",
      SUPER_ADMIN_EMAILS: " A@x.com, b@y.com ,",
      RESEND_API_KEY: "re_123",
    });
    expect(c.APP_URL).toBe("https://highfis.com");
    expect(c.superAdminEmails).toEqual(["a@x.com", "b@y.com"]);
    expect(c.features.email).toBe(true);
  });
});
