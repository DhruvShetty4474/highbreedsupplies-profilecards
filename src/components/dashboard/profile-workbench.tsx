"use client";

import { PublicProfile } from "@/components/profile/public-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_PROFILE_LAYOUT,
  type Profile,
  type ProfileLayout,
  type SocialLink,
} from "@/lib/types";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

const LAYOUT_TOGGLES: {
  key: keyof Omit<ProfileLayout, "section_order">;
  label: string;
  hint: string;
}[] = [
  { key: "show_hero", label: "Hero (avatar + banner)", hint: "Cover & circular avatar" },
  { key: "show_save_contact", label: "Save Contact CTA", hint: "Downloads .vcf" },
  { key: "show_exchange_contact", label: "Exchange Contact CTA", hint: "Opens lead form" },
  { key: "show_quick_actions", label: "Quick Connections", hint: "Call / Text / Email / Maps / Web" },
  { key: "show_about", label: "About Me block", hint: "Bio text panel" },
  { key: "show_video", label: "Video introduction", hint: "R2 / CDN video" },
  { key: "show_social", label: "Social Channels", hint: "Adaptive icon grid" },
  { key: "show_business", label: "Business Information", hint: "Email / phone / location" },
  { key: "show_lead_banner", label: "Share Your Info banner", hint: "Sticky footer CTA" },
];

export function ProfileWorkbench({
  profile,
  publicUrl,
}: {
  profile: Profile;
  publicUrl: string;
}) {
  const [draft, setDraft] = useState(profile);
  const [links, setLinks] = useState<SocialLink[]>(
    (profile.social_links ?? []).map((l, i) => ({
      ...l,
      visible: l.visible !== false,
      sort_order: l.sort_order ?? i,
    }))
  );
  const [layout, setLayout] = useState<ProfileLayout>({
    ...DEFAULT_PROFILE_LAYOUT,
    ...profile.layout,
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const liveProfile = useMemo<Profile>(
    () => ({ ...draft, social_links: links, layout }),
    [draft, links, layout]
  );

  async function save(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, social_links: links, layout }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error || "Save failed");
      return;
    }
    setMessage("Profile saved. Public page will refresh via ISR shortly.");
  }

  function updateLink(index: number, patch: Partial<SocialLink>) {
    setLinks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function moveLink(index: number, dir: -1 | 1) {
    setLinks((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((l, i) => ({ ...l, sort_order: i }));
    });
  }

  function moveSection(index: number, dir: -1 | 1) {
    setLayout((prev) => {
      const order = [...prev.section_order];
      const target = index + dir;
      if (target < 0 || target >= order.length) return prev;
      [order[index], order[target]] = [order[target], order[index]];
      return { ...prev, section_order: order };
    });
  }

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col xl:flex-row">
      <form
        onSubmit={save}
        className="flex w-full flex-col xl:max-w-[560px] xl:border-r xl:border-hb-sand xl:pr-8"
      >
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
              Profile workbench
            </p>
            <h1 className="mt-1 font-display text-4xl text-hb-ink">
              Block editor
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-hb-leaf">
              Toggle, reorder, and edit every public block. The desktop preview
              on the right updates live.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-hb-sand bg-white px-3 text-xs font-semibold text-hb-forest"
              onClick={() => navigator.clipboard.writeText(publicUrl)}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy URL
            </button>
            <Link
              href={`/${draft.username}`}
              target="_blank"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-hb-mist px-3 text-xs font-semibold text-hb-action"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open live
            </Link>
          </div>
        </header>

        <div className="space-y-6 overflow-y-auto pb-28 xl:pb-10">
          {/* Layout visibility */}
          <section className="rounded-2xl border border-hb-sand/80 bg-white/90 p-5 shadow-soft backdrop-blur-md">
            <h2 className="text-sm font-semibold text-hb-ink">
              Visible blocks
            </h2>
            <p className="mt-1 text-xs text-hb-leaf">
              Hide or show layers on the public profile.
            </p>
            <ul className="mt-4 divide-y divide-hb-sand/70">
              {LAYOUT_TOGGLES.map((item) => {
                const on = layout[item.key];
                return (
                  <li
                    key={item.key}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-hb-ink">
                        {item.label}
                      </p>
                      <p className="text-xs text-hb-leaf">{item.hint}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setLayout((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${
                        on
                          ? "bg-hb-action text-white"
                          : "bg-hb-mist text-hb-leaf"
                      }`}
                    >
                      {on ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                      {on ? "Shown" : "Hidden"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Section order */}
          <section className="rounded-2xl border border-hb-sand/80 bg-white/90 p-5 shadow-soft backdrop-blur-md">
            <h2 className="text-sm font-semibold text-hb-ink">
              Content section order
            </h2>
            <ul className="mt-3 space-y-2">
              {layout.section_order.map((key, index) => (
                <li
                  key={key}
                  className="flex items-center justify-between rounded-xl border border-hb-sand/70 bg-hb-fog/50 px-3 py-2.5"
                >
                  <span className="text-sm font-medium capitalize text-hb-ink">
                    {key === "social" ? "Social Channels" : key}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-hb-sand bg-white"
                      onClick={() => moveSection(index, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-hb-sand bg-white"
                      onClick={() => moveSection(index, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-hb-sand/80 bg-white/90 p-5 shadow-soft backdrop-blur-md">
            <h2 className="text-sm font-semibold text-hb-ink">Identity</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input
                label="Display name"
                value={draft.full_name}
                onChange={(e) =>
                  setDraft({ ...draft, full_name: e.target.value })
                }
              />
              <Input
                label="Headline"
                value={draft.designation}
                onChange={(e) =>
                  setDraft({ ...draft, designation: e.target.value })
                }
              />
              <Input
                label="Location"
                value={draft.location}
                onChange={(e) =>
                  setDraft({ ...draft, location: e.target.value })
                }
              />
              <Input
                label="Phone"
                value={draft.phone ?? ""}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Email"
                  value={draft.email ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, email: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="About / bio"
                  value={draft.bio}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-hb-sand/80 bg-white/90 p-5 shadow-soft backdrop-blur-md">
            <h2 className="text-sm font-semibold text-hb-ink">
              Media — Avatar, Cover, Video
            </h2>
            <div className="mt-3 grid gap-3">
              <Input
                label="Avatar URL"
                value={draft.avatar_url ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, avatar_url: e.target.value })
                }
                hint="High-resolution circular avatar (R2 recommended)"
              />
              <Input
                label="Cover banner URL"
                value={draft.banner_url ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, banner_url: e.target.value })
                }
              />
              <Input
                label="Video introduction URL"
                value={draft.video_url ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, video_url: e.target.value })
                }
                hint="Loop-friendly intro — Cloudflare R2 for zero egress"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-hb-sand/80 bg-white/90 p-5 shadow-soft backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-hb-ink">
                  Social & custom links
                </h2>
                <p className="text-xs text-hb-leaf">
                  Toggle visibility and reorder tiles.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  setLinks((prev) => [
                    ...prev,
                    {
                      id: `s_${Date.now()}`,
                      type: "custom",
                      label: "New link",
                      path: "https://",
                      sort_order: prev.length,
                      visible: true,
                    },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {links.map((link, index) => (
                <div
                  key={link.id}
                  className="rounded-xl border border-hb-sand/70 bg-hb-fog/50 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateLink(index, { visible: link.visible === false })
                      }
                      className={`inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold ${
                        link.visible !== false
                          ? "bg-hb-action text-white"
                          : "bg-white text-hb-leaf"
                      }`}
                    >
                      {link.visible !== false ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                      {link.visible !== false ? "Visible" : "Hidden"}
                    </button>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-hb-sand bg-white"
                        onClick={() => moveLink(index, -1)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-hb-sand bg-white"
                        onClick={() => moveLink(index, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-hb-sand text-hb-danger"
                        onClick={() =>
                          setLinks((prev) =>
                            prev.filter((_, i) => i !== index)
                          )
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      label="Label"
                      value={link.label}
                      onChange={(e) =>
                        updateLink(index, { label: e.target.value })
                      }
                    />
                    <Input
                      label="URL / path"
                      value={link.path}
                      onChange={(e) =>
                        updateLink(index, { path: e.target.value })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 z-10 mt-auto border-t border-hb-sand/80 bg-[#F3F8F6]/95 py-4 backdrop-blur">
          <Button type="submit" disabled={pending}>
            <Save className="h-4 w-4" />
            {pending ? "Saving…" : "Save profile"}
          </Button>
          {message ? (
            <p className="mt-2 text-sm text-hb-action">{message}</p>
          ) : null}
        </div>
      </form>

      <aside className="relative hidden flex-1 xl:block">
        <div className="sticky top-6 flex h-[calc(100dvh-3rem)] flex-col items-center justify-center rounded-3xl border border-hb-sand/50 bg-[radial-gradient(600px_360px_at_50%_0%,rgba(61,190,139,0.22),transparent_60%),linear-gradient(180deg,#0F3D32,#071512)] p-8">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-hb-mint/85">
            Live public preview
          </p>
          <PublicProfile profile={liveProfile} embedded />
        </div>
      </aside>

      <div className="mt-10 xl:hidden">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
          Live preview
        </p>
        <div className="flex justify-center rounded-3xl bg-hb-forest/95 py-10">
          <PublicProfile profile={liveProfile} embedded />
        </div>
      </div>
    </div>
  );
}
