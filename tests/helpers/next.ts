/** A single "browser": its cookie jar is shared by mocked next/headers. */
export const jar = new Map<string, string>();

export const ORIGIN = "http://localhost:3000";

export function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export function currentRequestHeaders() {
  const h = new Headers({ origin: ORIGIN, "cf-connecting-ip": testIp.value });
  const c = cookieHeader();
  if (c) h.set("cookie", c);
  return h;
}

/** Vary per test so IP rate limits don't leak across tests. */
export const testIp = { value: "203.0.113.1" };

export function signOutBrowser() {
  jar.clear();
}

/** Build a Request as the current browser would send it. */
export function req(path: string, init: { method?: string; body?: unknown } = {}) {
  const headers = currentRequestHeaders();
  if (init.body !== undefined) headers.set("content-type", "application/json");
  return new Request(`${ORIGIN}${path}`, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

/** Better Auth returns Set-Cookie on handler responses; store them. */
export function absorbSetCookies(res: Response) {
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const [pair, ...attrs] = line.split(";");
    const i = pair.indexOf("=");
    const name = pair.slice(0, i).trim();
    const value = pair.slice(i + 1).trim();
    const expired = attrs.some((a) => /max-age=0/i.test(a));
    if (expired || !value) jar.delete(name);
    else jar.set(name, value);
  }
  return res;
}

export function params<T extends Record<string, string>>(p: T) {
  return { params: Promise.resolve(p) };
}
