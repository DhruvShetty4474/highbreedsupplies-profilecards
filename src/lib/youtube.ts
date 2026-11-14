/** Pure YouTube URL helpers (safe for client bundles). */
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** Accepts watch, youtu.be, shorts, embed and live URLs. */
export function parseYouTubeId(input: string): string | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
      id = m?.[2] ?? null;
    }
  }
  return id && YT_ID.test(id) ? id : null;
}

export function youTubeEmbedUrl(id: string) {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

export function canonicalYouTubeUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

