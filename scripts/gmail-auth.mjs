#!/usr/bin/env node
/**
 * One-time: get a Gmail API refresh token so the app can send OTP emails
 * as highbreedsuppliesotp56@gmail.com.
 *
 *   npm run gmail:auth -- <CLIENT_ID> <CLIENT_SECRET>
 *
 * 1. Opens a Google sign-in URL. Sign in as the Gmail account that should
 *    send the emails and allow "Send email on your behalf".
 * 2. Google redirects back to http://127.0.0.1:53682 (this script).
 * 3. Prints GMAIL_REFRESH_TOKEN. Store all three values as secrets:
 *      npx wrangler secret put GMAIL_CLIENT_ID
 *      npx wrangler secret put GMAIL_CLIENT_SECRET
 *      npx wrangler secret put GMAIL_REFRESH_TOKEN
 *
 * Only the gmail.send scope is requested: the app can send mail, never read it.
 */
import { createServer } from "node:http";
import { exec } from "node:child_process";

const [clientId = process.env.GMAIL_CLIENT_ID, clientSecret = process.env.GMAIL_CLIENT_SECRET] =
  process.argv.slice(2);
if (!clientId || !clientSecret) {
  console.error("Usage: npm run gmail:auth -- <CLIENT_ID> <CLIENT_SECRET>");
  process.exit(1);
}

const PORT = 53682;
const redirectUri = `http://127.0.0.1:${PORT}`;
const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.send",
    access_type: "offline",
    prompt: "consent",
    login_hint: "highbreedsuppliesotp56@gmail.com",
  });

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", redirectUri);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (!code) {
    res.end(error ? `Google returned: ${error}` : "Waiting for Google…");
    if (error) {
      console.error("Google returned an error:", error);
      server.close();
    }
    return;
  }
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const json = await tokenRes.json();
  if (!json.refresh_token) {
    res.end("No refresh token received — see the terminal.");
    console.error("No refresh_token in Google's response:", json);
  } else {
    res.end("Done! You can close this tab and go back to the terminal.");
    console.log("\nGMAIL_REFRESH_TOKEN=" + json.refresh_token + "\n");
    console.log("Save it (and the client id/secret) with `npx wrangler secret put ...`,");
    console.log("and in .env.local / .dev.vars for local testing. Keep it secret.");
  }
  server.close();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Open this URL and sign in as highbreedsuppliesotp56@gmail.com:\n");
  console.log(authUrl + "\n");
  const opener =
    process.platform === "win32" ? `start "" "${authUrl}"` : process.platform === "darwin" ? `open "${authUrl}"` : `xdg-open "${authUrl}"`;
  exec(opener, () => {});
});
