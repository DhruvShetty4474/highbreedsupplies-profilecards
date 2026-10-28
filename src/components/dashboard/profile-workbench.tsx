"use client";

import { MediaPicker } from "@/components/dashboard/media-picker";
import { PublicProfile } from "@/components/profile/public-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_PROFILE_LAYOUT,
  type ContentBlock,
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
  ImageIcon,
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
  { key: "show_hero", label: "Hero (avatar + banner)", hint: "Top cover & photo" },
  { key: "show_save_contact", label: "Save Contact", hint: "Downloads .vcf" },
  { key: "show_exchange_contact", label: "Exchange Contact", hint: "Opens lead form" },
  { key: "show_quick_actions", label: "Quick connections", hint: "Call / Text / Email / Maps / Web" },
  { key: "show_about", label: "About Me", hint: "Bio panel" },
  { key: "show_media", label: "Media & content", hint: "Images, gallery, video, text, files" },
  { key: "show_social", label: "Social channels", hint: "Icon grid" },
  { key: "show_business", label: "Business info", hint: "Email / phone / location" },
  { key: "show_lead_banner", label: "Share Your Info banner", hint: "Sticky footer CTA" },
];

export function ProfileWorkbench({
  profile,
  publicUrl,
  adminUserId,
}: {
  profile: Profile;
  publicUrl: string;
  /** When set, saves are applied to this customer (admin edit mode). */
  adminUserId?: string;
}) {
  const [draft, setDraft] = useState(profile);
  const [links, setLinks] = useState<SocialLink[]>(
    (profile.social_links ?? []).map((l, i) => ({
      ...l,
      visible: l.visible !== false,
      sort_order: l.sort_order ?? i,
    }))
  );
  const [blocks, setBlocks] = useState<ContentBlock[]>(
    (profile.content_blocks ?? []).map((b, i) => ({
      ...b,
      visible: b.visible !== false,
      sort_order: b.sort_order ?? i,
    }))
  );
  const [layout, setLayout] = useState<ProfileLayout>({
    ...DEFAULT_PROFILE_LAYOUT,
    ...profile.layout,
    section_order:
      profile.layout?.section_order?.map((k) =>
        // migrate legacy "video" key
        (k as string) === "video" ? "media" : k
      ) as ProfileLayout["section_order"] ?? DEFAULT_PROFILE_LAYOUT.section_order,
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const liveProfile = useMemo<Profile>(
    () => ({
      ...draft,
      social_links: links,
      content_blocks: blocks,
      layout,
    }),
    [draft, links, blocks, layout]
  );

  async function save(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(adminUserId ? { user_id: adminUserId } : {}),
        ...draft,
        social_links: links,
        content_blocks: blocks,
        layout,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error || "Save failed");
      return;
    }
    setMessage(
      adminUserId
        ? "Customer profile saved."
        : "Profile saved. Public page updates shortly."
    );
  }

  function updateLink(index: number, patch: Partial<SocialLink>) {
    setLinks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function updateBlock(index: number, patch: Partial<ContentBlock>) {
    setBlocks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function move<T>(list: T[], index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col gap-8 xl:flex-row xl:gap-0">
      <form
        onSubmit={save}
        className="flex w-full flex-col xl:max-w-[560px] xl:border-r xl:border-hb-sand xl:pr-8"
      >
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 sm:mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
              {adminUserId ? "Admin · customer editor" : "Profile workbench"}
            </p>
            <h1 className="mt-1 font-display text-3xl text-hb-ink sm:text-4xl">
              Block editor
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-hb-leaf">
              Add a background image, avatar, content blocks, and social links.
              Preview updates live — desktop on the right, mobile below.
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
          <section className="rounded-2xl border border-hb-sand/80 bg-white/90 p-5 shadow-soft">
            <h2 className="text-sm font-semibold text-hb-ink">Visible blocks</h2>
            <ul className="mt-3 divide-y divide-hb-sand/70">
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

          <section className="rounded-2xl border border-hb-sand/80 bg-white/90 p-5 shadow-soft">
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

          <section className="rounded-2xl border border-hb-sand/80 bg-white/90 p-5 shadow-soft">
            <h2 className="text-sm font-semibold text-hb-ink">
              Profile background & photo
            </h2>
            <p className="mt-1 text-xs text-hb-leaf">
              Background shows behind your name on the public card. Avatar is
              your circular photo.
            </p>
            <div className="mt-4 grid gap-6">
              <MediaPicker
                label="Profile background image"
                hint="Wide cover photo (16:7). Upload or paste a URL."
                kind="banner"
                value={draft.banner_url}
                onChange={(url) => setDraft({ ...draft, banner_url: url })}
              />
              <MediaPicker
                label="Profile photo"
                hint="Square works best."
                kind="avatar"
                value={draft.avatar_url}
                onChange={(url) => setDraft({ ...draft, avatar_url: url })}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-hb-sand/80 bg-white/90 p-5 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-hb-ink">
                  Content blocks
                </h2>
                <p className="text-xs text-hb-leaf">
                  Text, image, gallery, video, or file links.
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ["text", "Text"],
                    ["image", "Image"],
                    ["gallery", "Gallery"],
                    ["video", "Video"],
                    ["file", "File"],
                  ] as const
                ).map(([type, label]) => (
                  <Button
                    key={type}
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setBlocks((prev) => [
                        ...prev,
                        {
                          id: `b_${Date.now()}_${type}`,
                          type,
                          title: label,
                          body: type === "text" ? "" : undefined,
                          url: type !== "gallery" && type !== "text" ? "https://" : undefined,
                          urls:
                            type === "gallery"
                              ? ["https://", "https://"]
                              : undefined,
                          sort_order: prev.length,
                          visible: true,
                        },
                      ])
                    }
                  >
                    <Plus className="h-3 w-3" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {blocks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-hb-sand px-4 py-6 text-center text-sm text-hb-leaf">
                  <ImageIcon className="mx-auto mb-2 h-5 w-5" />
                  No content blocks yet — add an image or text above.
                </p>
              ) : null}
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  className="rounded-xl border border-hb-sand/70 bg-hb-fog/50 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-hb-forest">
                      {block.type}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-hb-sand bg-white"
                        onClick={() =>
                          setBlocks((prev) =>
                            move(prev, index, -1).map((b, i) => ({
                              ...b,
                              sort_order: i,
                            }))
                          )
                        }
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-hb-sand bg-white"
                        onClick={() =>
                          setBlocks((prev) =>
                            move(prev, index, 1).map((b, i) => ({
                              ...b,
                              sort_order: i,
                            }))
                          )
                        }
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-hb-sand text-hb-danger"
                        onClick={() =>
                          setBlocks((prev) =>
                            prev.filter((_, i) => i !== index)
                          )
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Input
                      label="Title"
                      value={block.title}
                      onChange={(e) =>
                        updateBlock(index, { title: e.target.value })
                      }
                    />
                    {block.type === "text" ? (
                      <Textarea
                        label="Body"
                        value={block.body ?? ""}
                        onChange={(e) =>
                          updateBlock(index, { body: e.target.value })
                        }
                      />
                    ) : null}
                    {block.type === "gallery" ? (
                      <Textarea
                        label="Image URLs (one per line)"
                        value={(block.urls ?? []).join("\n")}
                        onChange={(e) =>
                          updateBlock(index, {
                            urls: e.target.value
                              .split("\n")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    ) : block.type !== "text" ? (
                      <Input
                        label={
                          block.type === "file" ? "File URL" : "Media URL"
                        }
                        value={block.url ?? ""}
                        onChange={(e) =>
                          updateBlock(index, { url: e.target.value })
                        }
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-hb-sand/80 bg-white/90 p-5 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-hb-ink">
                Social links
              </h2>
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
                  <div className="mb-2 flex justify-end gap-1">
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-hb-sand bg-white"
                      onClick={() =>
                        setLinks((prev) =>
                          move(prev, index, -1).map((l, i) => ({
                            ...l,
                            sort_order: i,
                          }))
                        )
                      }
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-hb-sand bg-white"
                      onClick={() =>
                        setLinks((prev) =>
                          move(prev, index, 1).map((l, i) => ({
                            ...l,
                            sort_order: i,
                          }))
                        )
                      }
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-hb-sand text-hb-danger"
                      onClick={() =>
                        setLinks((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
                      label="URL"
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

        <div className="sticky bottom-0 z-10 mt-auto border-t border-hb-sand/80 bg-hb-fog/95 py-4 backdrop-blur">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            <Save className="h-4 w-4" />
            {pending ? "Saving…" : "Save profile"}
          </Button>
          {message ? (
            <p className="mt-2 text-sm font-medium text-hb-leaf">{message}</p>
          ) : null}
        </div>
      </form>

      {/* Mobile / tablet live preview */}
      <div className="xl:hidden">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
          Live preview
        </p>
        <div className="mx-auto max-w-[390px] overflow-hidden rounded-[28px] border border-hb-sand bg-white shadow-lift">
          <PublicProfile profile={liveProfile} embedded />
        </div>
      </div>

      <aside className="relative hidden flex-1 xl:block">
        <div className="sticky top-6 flex h-[calc(100dvh-3rem)] flex-col items-center justify-center rounded-3xl border border-hb-gold/20 bg-[radial-gradient(600px_360px_at_50%_0%,rgba(240,201,74,0.22),transparent_55%),linear-gradient(180deg,#0B5C45,#062E24)] p-6 xl:p-8">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-hb-goldSoft">
            Live public preview
          </p>
          <div className="w-full max-w-[390px] overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-lift">
            <PublicProfile profile={liveProfile} embedded />
          </div>
        </div>
      </aside>
    </div>
  );
}
