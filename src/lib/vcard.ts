import type { Profile } from "@/lib/types";

function escapeVCard(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Build a valid vCard 3.0 payload from a HIGHBREED profile. */
export function buildVCard(profile: Profile) {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(profile.full_name || profile.username)}`,
    `N:${escapeVCard(profile.full_name || profile.username)};;;;`,
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
  if (website?.path) {
    lines.push(`URL:${escapeVCard(website.path)}`);
  }

  lines.push(
    `URL;TYPE=Highbreed:https://highbreedsupplies.com/${escapeVCard(profile.username)}`
  );
  lines.push("END:VCARD");

  return `${lines.join("\r\n")}\r\n`;
}
