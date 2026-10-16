"use client";

import { HighbreedMark } from "@/components/brand/logo";
import { LeadCapture } from "@/components/profile/lead-capture";
import { socialVisual } from "@/components/profile/social-styles";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PROFILE_LAYOUT,
  type ContentBlock,
  type Profile,
  type ProfileLayout,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Download,
  FileText,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Props = {
  profile: Profile;
  /** Compact preview used inside dashboard workbench only */
  embedded?: boolean;
  preview?: boolean;
};

function resolveLayout(profile: Profile): ProfileLayout {
  const raw = { ...DEFAULT_PROFILE_LAYOUT, ...profile.layout } as ProfileLayout & {
    show_video?: boolean;
  };
  const order = (raw.section_order ?? DEFAULT_PROFILE_LAYOUT.section_order).map(
    (k) => ((k as string) === "video" ? "media" : k)
  ) as ProfileLayout["section_order"];
  return {
    ...raw,
    show_media: raw.show_media ?? raw.show_video ?? true,
    section_order: order,
  };
}

function MediaBlocks({
  blocks,
  preview,
}: {
  blocks: ContentBlock[];
  preview: boolean;
}) {
  const list = [...blocks]
    .filter((b) => b.visible !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (list.length === 0) return null;

  return (
    <div className="space-y-4">
      {list.map((block) => (
        <article
          key={block.id}
          className="overflow-hidden rounded-2xl border border-white/80 bg-white/70 shadow-soft backdrop-blur-md"
        >
          {block.title ? (
            <div className="border-b border-hb-sand/50 px-5 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-hb-leaf">
                {block.title}
              </h3>
            </div>
          ) : null}
          <div className="p-4">
            {block.type === "text" ? (
              <p className="text-[15px] leading-7 text-hb-forest">
                {block.body}
              </p>
            ) : null}
            {block.type === "image" && block.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={block.url}
                alt={block.title}
                className="w-full rounded-xl object-cover"
              />
            ) : null}
            {block.type === "gallery" && block.urls?.length ? (
              <div className="grid grid-cols-2 gap-2">
                {block.urls.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            ) : null}
            {block.type === "video" && block.url ? (
              <video
                className="aspect-video w-full rounded-xl object-cover"
                controls={!preview}
                muted={preview}
                playsInline
                loop
                autoPlay={preview}
                preload="metadata"
              >
                <source src={block.url} />
              </video>
            ) : null}
            {block.type === "file" && block.url ? (
              <a
                href={preview ? undefined : block.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-hb-mist px-4 py-3 text-sm font-semibold text-hb-action"
              >
                <FileText className="h-4 w-4" />
                {block.title || "Download file"}
              </a>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: "easeOut" as const },
});

export function PublicProfileView({
  profile,
  preview = false,
  compact = false,
}: {
  profile: Profile;
  preview?: boolean;
  compact?: boolean;
}) {
  const [leadOpen, setLeadOpen] = useState(false);
  const layout = resolveLayout(profile);

  useEffect(() => {
    if (preview) return;
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: profile.user_id, event: "reach" }),
    });
  }, [preview, profile.user_id]);

  const links = useMemo(
    () =>
      [...(profile.social_links ?? [])]
        .filter((l) => l.visible !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [profile.social_links]
  );

  const website =
    links.find((l) => l.type === "website")?.path ||
    `https://highbreedsupplies.com/${profile.username}`;

  const mapsUrl = profile.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.location)}`
    : null;

  async function shareProfile() {
    if (preview) return;
    const url = `${window.location.origin}/${profile.username}`;
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: profile.user_id, event: "share" }),
    });
    if (navigator.share) {
      await navigator.share({
        title: profile.full_name,
        text: profile.designation,
        url,
      });
      return;
    }
    await navigator.clipboard.writeText(url);
  }

  function trackContactSave() {
    if (preview) return;
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: profile.user_id,
        event: "contact_save",
      }),
    });
  }

  const quick = [
    profile.phone
      ? { key: "call", label: "Call", href: `tel:${profile.phone}`, icon: Phone }
      : null,
    profile.phone
      ? {
          key: "text",
          label: "Text",
          href: `sms:${profile.phone}`,
          icon: MessageCircle,
        }
      : null,
    profile.email
      ? {
          key: "email",
          label: "Email",
          href: `mailto:${profile.email}`,
          icon: Mail,
        }
      : null,
    mapsUrl
      ? { key: "maps", label: "Maps", href: mapsUrl, icon: MapPin }
      : null,
    { key: "web", label: "Web", href: website, icon: Globe },
  ].filter(Boolean) as {
    key: string;
    label: string;
    href: string;
    icon: typeof Phone;
  }[];

  const sections: Record<string, React.ReactNode> = {
    about:
      layout.show_about && profile.bio ? (
        <motion.section
          key="about"
          {...fade(0.28)}
          className="rounded-2xl border border-white/80 bg-white/70 p-6 shadow-soft backdrop-blur-md"
        >
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-hb-leaf">
            About Me
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-hb-forest">
            {profile.bio}
          </p>
        </motion.section>
      ) : null,
    media:
      layout.show_media &&
      ((profile.content_blocks && profile.content_blocks.length > 0) ||
        profile.video_url) ? (
        <motion.section key="media" {...fade(0.32)} className="space-y-3">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-hb-leaf">
            Media & content
          </h2>
          <MediaBlocks
            blocks={
              profile.content_blocks?.length
                ? profile.content_blocks
                : profile.video_url
                  ? [
                      {
                        id: "legacy-video",
                        type: "video",
                        title: "Introduction",
                        url: profile.video_url,
                        visible: true,
                      },
                    ]
                  : []
            }
            preview={preview}
          />
        </motion.section>
      ) : null,
    social:
      layout.show_social && links.length > 0 ? (
        <motion.section
          key="social"
          {...fade(0.36)}
          className="rounded-2xl border border-white/80 bg-white/70 p-6 shadow-soft backdrop-blur-md"
        >
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-hb-leaf">
            Social Channels
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {links.map((link, i) => {
              const visual = socialVisual(link.type);
              const tile = (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.38 + i * 0.04 }}
                  className={cn(
                    "flex h-14 items-center gap-2.5 rounded-xl px-3.5 text-sm font-semibold tracking-wide shadow-soft transition hover:brightness-105 active:scale-[0.98]",
                    visual.className
                  )}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-[10px] font-bold uppercase">
                    {visual.glyph}
                  </span>
                  <span className="truncate">{link.label}</span>
                </motion.span>
              );
              return preview ? (
                <div key={link.id}>{tile}</div>
              ) : (
                <a
                  key={link.id}
                  href={link.path}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tile}
                </a>
              );
            })}
          </div>
        </motion.section>
      ) : null,
    business:
      layout.show_business &&
      (profile.email || profile.phone || profile.location) ? (
        <motion.section
          key="business"
          {...fade(0.4)}
          className="rounded-2xl border border-white/80 bg-white/70 p-6 shadow-soft backdrop-blur-md"
        >
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-hb-leaf">
            Business Information
          </h2>
          <dl className="mt-4 space-y-3 text-[15px]">
            {profile.email ? (
              <div className="flex justify-between gap-4 border-b border-hb-sand/50 pb-3">
                <dt className="text-hb-leaf">Email</dt>
                <dd className="truncate font-medium text-hb-ink">
                  {profile.email}
                </dd>
              </div>
            ) : null}
            {profile.phone ? (
              <div className="flex justify-between gap-4 border-b border-hb-sand/50 pb-3">
                <dt className="text-hb-leaf">Phone</dt>
                <dd className="font-medium text-hb-ink">{profile.phone}</dd>
              </div>
            ) : null}
            {profile.location ? (
              <div className="flex justify-between gap-4">
                <dt className="text-hb-leaf">Location</dt>
                <dd className="font-medium text-hb-ink">{profile.location}</dd>
              </div>
            ) : null}
          </dl>
        </motion.section>
      ) : null,
  };

  return (
    <div
      className={cn(
        "relative flex flex-col bg-[#F7FBF9]",
        compact ? "pb-20" : "min-h-full pb-28"
      )}
    >
      {layout.show_hero ? (
        <>
          <motion.div
            {...fade(0)}
            className={cn(
              "relative w-full overflow-hidden",
              compact ? "h-36" : "h-48 sm:h-56"
            )}
          >
            {profile.banner_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.banner_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-hb-banner">
                <div className="absolute inset-0 opacity-45 [background:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.45),transparent_42%),radial-gradient(circle_at_85%_10%,rgba(61,190,139,0.55),transparent_48%)]" />
              </div>
            )}
            <button
              type="button"
              onClick={shareProfile}
              className="absolute right-4 top-4 hb-focus inline-flex h-10 items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3.5 text-xs font-semibold tracking-wide text-white backdrop-blur-md"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </motion.div>

          <motion.div
            {...fade(0.06)}
            className="relative z-10 -mt-16 flex justify-center px-5"
          >
            <div className="rounded-full border-[4px] border-white bg-white p-1 shadow-[0_16px_48px_-18px_rgba(7,21,18,0.5)]">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className={cn(
                    "rounded-full object-cover",
                    compact ? "h-24 w-24" : "h-[120px] w-[120px]"
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "grid place-items-center overflow-hidden rounded-full bg-hb-banner",
                    compact ? "h-24 w-24" : "h-[120px] w-[120px]"
                  )}
                >
                  <HighbreedMark
                    size="md"
                    className="rounded-full border-0 shadow-none"
                  />
                </div>
              )}
            </div>
          </motion.div>

          <motion.div {...fade(0.12)} className="mt-5 px-6 text-center">
            <h1
              className={cn(
                "font-display tracking-tight text-hb-ink",
                compact ? "text-2xl" : "text-[2rem] leading-tight sm:text-[2.25rem]"
              )}
            >
              {profile.full_name}
            </h1>
            {profile.designation ? (
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-hb-leaf">
                {profile.designation}
              </p>
            ) : null}
            {profile.location ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-hb-leaf/80">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location}
              </p>
            ) : null}
          </motion.div>
        </>
      ) : null}

      <div className={cn("px-5 sm:px-6", compact ? "mt-4" : "mt-6")}>
        {/* Primary CTAs */}
        {(layout.show_save_contact || layout.show_exchange_contact) && (
          <motion.div {...fade(0.16)} className="grid gap-3 sm:grid-cols-2">
            {layout.show_save_contact ? (
              preview ? (
                <Button className="h-12 w-full text-[15px]" type="button">
                  <Download className="h-4 w-4" />
                  Save Contact
                </Button>
              ) : (
                <a
                  href={`/api/cards/${profile.user_id}/vcard`}
                  className="block"
                  onClick={trackContactSave}
                >
                  <Button className="h-12 w-full text-[15px]" type="button">
                    <Download className="h-4 w-4" />
                    Save Contact
                  </Button>
                </a>
              )
            ) : null}
            {layout.show_exchange_contact ? (
              <Button
                variant="secondary"
                className="h-12 w-full text-[15px]"
                type="button"
                onClick={() => !preview && setLeadOpen(true)}
              >
                <Users className="h-4 w-4" />
                Exchange Contact
              </Button>
            ) : null}
          </motion.div>
        )}

        {/* Quick Actions Grid */}
        {layout.show_quick_actions && quick.length > 0 ? (
          <motion.div
            {...fade(0.22)}
            className="mt-7 grid grid-cols-4 gap-3 sm:grid-cols-5"
          >
            {quick.map((item) => {
              const Icon = item.icon;
              const inner = (
                <>
                  <span className="grid h-14 w-14 place-items-center rounded-2xl border border-hb-sand/80 bg-white/80 text-hb-action shadow-soft backdrop-blur-md transition group-hover:border-hb-action/35 group-hover:shadow-lift group-active:scale-95">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-semibold tracking-wide text-hb-leaf">
                    {item.label}
                  </span>
                </>
              );
              return preview ? (
                <div
                  key={item.key}
                  className="group flex flex-col items-center gap-2"
                >
                  {inner}
                </div>
              ) : (
                <a
                  key={item.key}
                  href={item.href}
                  target={
                    item.key === "web" || item.key === "maps"
                      ? "_blank"
                      : undefined
                  }
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center gap-2"
                >
                  {inner}
                </a>
              );
            })}
          </motion.div>
        ) : null}

        <div className="mt-8 space-y-4">
          {layout.section_order.map((key) => sections[key])}
        </div>

        <p className="mt-10 pb-2 text-center text-[10px] uppercase tracking-[0.24em] text-hb-leaf/45">
          Powered by HIGHBREED
        </p>
      </div>

      {layout.show_lead_banner ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 p-4">
          <button
            type="button"
            onClick={() => !preview && setLeadOpen(true)}
            className="pointer-events-auto flex w-full items-center justify-between rounded-2xl border border-white/40 bg-hb-forest/95 px-5 py-4 text-left text-white shadow-lift backdrop-blur-md"
          >
            <div>
              <p className="text-[15px] font-semibold tracking-wide">
                Share Your Info
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/70">
                Leave your details for a follow-up
              </p>
            </div>
            <span className="rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold">
              Open
            </span>
          </button>
        </div>
      ) : null}

      {!preview ? (
        <LeadCapture
          open={leadOpen}
          onClose={() => setLeadOpen(false)}
          cardholderUserId={profile.user_id}
          cardholderName={profile.full_name}
        />
      ) : null}
    </div>
  );
}

/** Public route shell: elegant centered card on desktop, full-bleed on mobile — not a fake phone OS chrome. */
export function PublicProfile({ profile, embedded = false }: Props) {
  if (embedded) {
    return (
      <div className="mx-auto w-[300px] overflow-hidden rounded-[1.75rem] border border-white/25 bg-white shadow-lift">
        <div className="max-h-[640px] overflow-y-auto">
          <PublicProfileView profile={profile} preview compact />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-[radial-gradient(1000px_560px_at_12%_-8%,rgba(61,190,139,0.28),transparent_55%),radial-gradient(800px_480px_at_90%_0%,rgba(15,61,50,0.4),transparent_50%),linear-gradient(165deg,#071512_0%,#0F3D32_48%,#123F35_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl items-stretch justify-center px-0 py-0 sm:px-6 sm:py-10 lg:items-center lg:py-12">
        <div className="w-full max-w-[440px] overflow-hidden bg-[#F7FBF9] shadow-lift sm:rounded-[2rem] sm:border sm:border-white/25">
          <PublicProfileView profile={profile} />
        </div>
      </div>
    </div>
  );
}
