import type { Profile } from "@/lib/types";

function escapeVCard(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Build a valid vCard 3.0 payload from a HIGHBREED profile. */
export function buildVCard(profile: Profile, baseUrl = "https://highfis.com") {
  const full = (profile.full_name || profile.username).trim();
  // N is "Last;First;Middle;Prefix;Suffix" — phones use it to sort/display.
  const parts = full.split(/\s+/);
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : full;
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(full)}`,
    `N:${escapeVCard(last)};${escapeVCard(first)};;;`,
  ];

  if (profile.designation) {
    lines.push(`TITLE:${escapeVCard(profile.designation)}`);
  }
  if (profile.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(profile.email)}`);
  }
  if (profile.phone) {
    lines.push(`TEL;TYPE=CELL:${escapeVCard(profile.phone)}`);
  }
  if (profile.location) {
    lines.push(`ADR;TYPE=WORK:;;${escapeVCard(profile.location)};;;;`);
  }
  if (profile.bio) {
    lines.push(`NOTE:${escapeVCard(profile.bio)}`);
  }

  const website = profile.social_links.find((s) => s.type === "website");
  // URLs are not escaped (commas/semicolons in URLs are rare and valid).
  if (website?.path) lines.push(`URL:${website.path}`);
  lines.push(`URL:${baseUrl.replace(/\/$/, "")}/${profile.username}`);
  lines.push("END:VCARD");

  return `${lines.join("\r\n")}\r\n`;
}
