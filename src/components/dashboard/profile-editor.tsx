"use client";

import { HighbreedMark } from "@/components/brand/logo";
import { socialVisual } from "@/components/profile/social-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Profile, SocialLink } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Copy,
  Eye,
  MoreHorizontal,
  Plus,
  Share2,
  Shuffle,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

export function ProfileEditor({
  profile,
  publicUrl,
}: {
  profile: Profile;
  publicUrl: string;
}) {
  const [draft, setDraft] = useState(profile);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [links, setLinks] = useState<SocialLink[]>(profile.social_links ?? []);

  const sortedLinks = useMemo(
    () => [...links].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [links]
  );

  async function save(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, social_links: links }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error || "Save failed");
      return;
    }
    setMessage("Profile saved");
    setEditing(false);
  }

  function addLink() {
    setLinks((prev) => [
      ...prev,
      {
        id: `s_${Date.now()}`,
        type: "custom",
        label: "Custom Link",
        path: "https://",
        sort_order: prev.length,
      },
    ]);
    setEditing(true);
  }

  function shuffleLinks() {
    setLinks((prev) => {
      const next = [...prev].reverse().map((l, i) => ({ ...l, sort_order: i }));
      return next;
    });
  }

  return (
    <div>
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-semibold text-hb-ink"
        >
          {draft.username}
          <span className="text-hb-leaf">▾</span>
        </button>
        <div className="flex items-center gap-2">
          <Link href={`/${draft.username}`}>
            <Button variant="outline" size="sm">
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
          </Link>
          <button
            type="button"
            className="hb-focus grid h-9 w-9 place-items-center rounded-xl bg-white text-hb-forest shadow-soft"
            aria-label="More"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="relative mt-4 overflow-hidden rounded-[28px] bg-hb-banner">
        <div className="h-28" />
        <div className="absolute inset-x-0 -bottom-10 flex justify-center">
          <div className="rounded-[26px] border-4 border-hb-fog bg-white p-1.5 shadow-soft">
            <HighbreedMark size="md" className="rounded-[20px]" />
          </div>
        </div>
      </div>

      <div className="mt-14 text-center">
        <h1 className="font-display text-2xl text-hb-ink">{draft.full_name}</h1>
        <p className="mt-1 text-sm text-hb-leaf">{draft.designation}</p>
        <p className="text-sm text-hb-leaf/80">{draft.location}</p>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="mt-3 text-sm font-semibold text-hb-action"
        >
          {editing ? "Close editor" : "Edit Contact"}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-full border border-hb-sand bg-white px-4 py-2 text-sm shadow-soft">
        <span className="truncate text-hb-leaf">{publicUrl.replace(/^https?:\/\//, "")}</span>
        <button
          type="button"
          className="hb-focus text-hb-action"
          onClick={() => navigator.clipboard.writeText(publicUrl)}
          aria-label="Copy public URL"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-5 space-y-3 rounded-[28px] bg-white/90 p-4 shadow-soft">
          <Input
            label="Display name"
            value={draft.full_name}
            onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
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
            onChange={(e) => setDraft({ ...draft, location: e.target.value })}
          />
          <Textarea
            label="Bio"
            value={draft.bio}
            onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
          />
          <Input
            label="Phone"
            value={draft.phone ?? ""}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          />
          <Input
            label="Email"
            value={draft.email ?? ""}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          />
          <Input
            label="Video URL (R2 or CDN)"
            value={draft.video_url ?? ""}
            onChange={(e) => setDraft({ ...draft, video_url: e.target.value })}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-hb-forest">Social links</p>
            {links.map((link, index) => (
              <div key={link.id} className="grid gap-2 rounded-2xl bg-hb-mist/60 p-3">
                <Input
                  label="Label"
                  value={link.label}
                  onChange={(e) => {
                    const next = [...links];
                    next[index] = { ...link, label: e.target.value };
                    setLinks(next);
                  }}
                />
                <Input
                  label="URL / path"
                  value={link.path}
                  onChange={(e) => {
                    const next = [...links];
                    next[index] = { ...link, path: e.target.value };
                    setLinks(next);
                  }}
                />
              </div>
            ))}
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          {message ? (
            <p className="text-center text-sm text-hb-action">{message}</p>
          ) : null}
        </form>
      ) : null}

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-hb-ink">About Highbreeds</h2>
          <button
            type="button"
            className="text-sm font-semibold text-hb-action"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm text-hb-forest shadow-soft">
          {draft.bio || "Add a short bio about your brand."}
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-hb-ink">Socials</h2>
          <button
            type="button"
            className="text-sm font-semibold text-hb-action"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        </div>
        {sortedLinks.map((link) => {
          const visual = socialVisual(link.type);
          return (
            <div
              key={link.id}
              className={cn(
                "flex h-14 items-center gap-3 rounded-2xl px-4 shadow-soft",
                visual.className
              )}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 text-xs font-bold uppercase">
                {visual.glyph}
              </span>
              <span className="flex-1 text-center text-sm font-semibold">
                {link.label}
              </span>
              <span className="w-9" />
            </div>
          );
        })}
      </section>

      <div className="sticky bottom-24 mt-8 flex gap-3">
        <Button className="flex-1" onClick={addLink}>
          <Plus className="h-4 w-4" />
          Add Content
        </Button>
        <Button variant="secondary" onClick={shuffleLinks} aria-label="Sort">
          <Shuffle className="h-4 w-4" />
          Sort
        </Button>
      </div>

      <Link
        href={`/${draft.username}`}
        className="fixed bottom-28 left-4 z-30 inline-flex items-center gap-2 rounded-full bg-hb-action px-3 py-2 text-xs font-semibold text-white shadow-lift"
      >
        <Eye className="h-3.5 w-3.5" />
        Preview Page
      </Link>
    </div>
  );
}
