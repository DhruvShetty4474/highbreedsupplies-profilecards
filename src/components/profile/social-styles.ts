import type { SocialLink } from "@/lib/types";

export function socialVisual(type: SocialLink["type"]) {
  switch (type) {
    case "instagram":
      return {
        className:
          "bg-[linear-gradient(135deg,#F58529,#DD2A7B_45%,#8134AF_75%,#515BD4)] text-white",
        glyph: "ig",
      };
    case "linkedin":
      return { className: "bg-[#0A66C2] text-white", glyph: "in" };
    case "facebook":
      return { className: "bg-[#1877F2] text-white", glyph: "f" };
    case "whatsapp":
      return { className: "bg-[#25D366] text-white", glyph: "wa" };
    case "twitter":
      return { className: "bg-[#111111] text-white", glyph: "x" };
    case "youtube":
      return { className: "bg-[#FF0000] text-white", glyph: "yt" };
    case "google_review":
      return {
        className:
          "bg-[linear-gradient(135deg,#0E7C66,#1F6B54)] text-white",
        glyph: "G",
      };
    case "website":
      return {
        className:
          "bg-[linear-gradient(135deg,#D7E5DF,#A8D5C4)] text-hb-forest",
        glyph: "◎",
      };
    case "email":
      return { className: "bg-hb-mist text-hb-forest", glyph: "@" };
    case "phone":
      return { className: "bg-hb-mist text-hb-forest", glyph: "☎" };
    default:
      return { className: "bg-hb-forest text-white", glyph: "→" };
  }
}
