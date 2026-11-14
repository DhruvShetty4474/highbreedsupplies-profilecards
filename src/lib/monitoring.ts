import { getConfig } from "@/config";

/**
 * Report an exception to Sentry using its HTTP envelope API (no SDK, keeps
 * the Worker small). Without SENTRY_DSN this only logs.
 */
export async function captureException(err: unknown, context?: Record<string, unknown>) {
  console.error(err);
  let dsn: string | undefined;
  try {
    dsn = getConfig().SENTRY_DSN;
  } catch {
    return; // config itself is broken — already logged
  }
  if (!dsn) return;

  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, "");
    const publicKey = u.username;
    const endpoint = `${u.protocol}//${u.host}/api/${projectId}/envelope/`;
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const e = err instanceof Error ? err : new Error(String(err));
    const event = {
      event_id: eventId,
      timestamp: Date.now() / 1000,
      platform: "javascript",
      level: "error",
      environment: process.env.NODE_ENV,
      exception: {
        values: [{ type: e.name, value: e.message, stacktrace: undefined }],
      },
      extra: { stack: e.stack, ...context },
    };
    const body =
      JSON.stringify({ event_id: eventId, dsn }) +
      "\n" +
      JSON.stringify({ type: "event" }) +
      "\n" +
      JSON.stringify(event);
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=highbreed/1.0`,
      },
      body,
    });
  } catch {
    // Monitoring must never break the request.
  }
}
