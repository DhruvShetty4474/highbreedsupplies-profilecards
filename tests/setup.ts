import { vi } from "vitest";

// `server-only` throws outside the React server bundler.
vi.mock("server-only", () => ({}));

// Route handlers and Better Auth's nextCookies() plugin read/write cookies
// through next/headers (the plugin imports "next/headers.js"). Back both
// with one in-memory browser jar.
const nextHeadersMock = vi.hoisted(() => async () => {
  const { jar, currentRequestHeaders } = await import("./helpers/next");
  return {
    headers: async () => currentRequestHeaders(),
    cookies: async () => ({
      get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      has: (name: string) => jar.has(name),
      set: (
        name: string | { name: string; value: string; maxAge?: number },
        value?: string,
        opts?: { maxAge?: number }
      ) => {
        const c =
          typeof name === "string" ? { name, value: value ?? "", maxAge: opts?.maxAge } : name;
        if (c.maxAge === 0 || c.value === "") jar.delete(c.name);
        else jar.set(c.name, c.value);
      },
      delete: (name: string) => jar.delete(name),
    }),
  };
});
vi.mock("next/headers", nextHeadersMock);
vi.mock("next/headers.js", nextHeadersMock);

// redirect()/notFound() throw in Next; make them inspectable.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error(`REDIRECT:${url}`), { url });
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
