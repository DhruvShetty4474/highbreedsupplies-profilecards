"use client";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { qrImageUrl } from "@/lib/share-prefs";
import { cn } from "@/lib/utils";
import {
  Copy,
  Download,
  FileSignature,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  QrCode,
  Share2,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  userId: string;
  fullName: string;
  username: string;
  pageUrl: string;
  initialOffline?: boolean;
  initialQuickShare?: "text" | "email" | null;
};

const OPTIONS = [
  {
    id: "share_link",
    label: "Share link",
    icon: Link2,
    action: "share_link" as const,
  },
  {
    id: "download_qr",
    label: "Download QR code",
    icon: Download,
    action: "download_qr" as const,
  },
  {
    id: "share_text",
    label: "Share as Text",
    icon: MessageSquare,
    action: "share_text" as const,
  },
  {
    id: "virtual_bg",
    label: "Create Virtual Background",
    icon: ImageIcon,
    action: "virtual_bg" as const,
  },
  {
    id: "wallet",
    label: "Add to Digital Wallet",
    icon: Wallet,
    action: "wallet" as const,
  },
  {
    id: "email_sig",
    label: "Create Email Signature",
    icon: FileSignature,
    action: "email_sig" as const,
  },
  {
    id: "hyper",
    label: "HYPER Linq",
    icon: Sparkles,
    action: "hyper" as const,
  },
  {
    id: "share_more",
    label: "More share…",
    icon: Share2,
    action: "share_more" as const,
  },
] as const;

export function SharePagePanel({
  userId,
  fullName,
  username,
  pageUrl,
  initialOffline = false,
  initialQuickShare = null,
}: Props) {
  const [offline, setOffline] = useState(initialOffline);
  const [quickShare, setQuickShare] = useState<"text" | "email" | null>(
    initialQuickShare
  );
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupChoice, setSetupChoice] = useState<"text" | "email">(
    initialQuickShare === "email" ? "email" : "text"
  );
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const qrSrc = useMemo(() => qrImageUrl(pageUrl, 320), [pageUrl]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  async function persist(patch: {
    offline?: boolean;
    quick_share?: "text" | "email" | null;
  }) {
    setPending(true);
    await fetch("/api/share-prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, ...patch }),
    });
    setPending(false);
  }

  async function toggleOffline() {
    const next = !offline;
    setOffline(next);
    await persist({ offline: next });
    flash(next ? "Offline mode on for this page" : "Page is online");
  }

  async function runAction(action: (typeof OPTIONS)[number]["action"]) {
    switch (action) {
      case "share_link":
      case "share_more": {
        if (navigator.share) {
          await navigator.share({
            title: fullName,
            text: `Connect with ${fullName} on HIGHBREED`,
            url: pageUrl,
          });
        } else {
          await navigator.clipboard.writeText(pageUrl);
          flash("Link copied");
        }
        break;
      }
      case "download_qr": {
        const a = document.createElement("a");
        a.href = qrSrc;
        a.download = `${username}-highbreed-qr.png`;
        a.target = "_blank";
        a.rel = "noopener";
        a.click();
        flash("QR download started");
        break;
      }
      case "share_text": {
        const body = `Hi — here's my HIGHBREED page: ${pageUrl}`;
        await navigator.clipboard.writeText(body);
        flash("Share text copied");
        break;
      }
      case "virtual_bg":
        flash("Virtual background kit — coming soon in production");
        break;
      case "wallet":
        flash("Digital wallet pass — coming soon in production");
        break;
      case "email_sig": {
        const sig = `${fullName}\n${pageUrl}`;
        await navigator.clipboard.writeText(sig);
        flash("Email signature copied");
        break;
      }
      case "hyper":
        flash("HIGHBREED Hyper Card upsell — contact admin for hardware");
        break;
      default:
        break;
    }
  }

  async function saveQuickShare() {
    setQuickShare(setupChoice);
    await persist({ quick_share: setupChoice });
    setSetupOpen(false);
    flash(
      setupChoice === "text"
        ? "Quick Share set to Share as Text"
        : "Quick Share set to Share as Email"
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
          Share your page
        </p>
        <h1 className="mt-1 font-display text-3xl text-hb-ink sm:text-4xl">
          {fullName}
        </h1>
        <p className="mt-1 text-sm text-hb-leaf">@{username}</p>
      </header>

      <section className="rounded-3xl border border-hb-sand/80 bg-white p-6 shadow-soft">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="shrink-0 rounded-2xl border border-hb-sand bg-hb-fog p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt={`QR for ${username}`}
              className="h-44 w-44 rounded-xl bg-white sm:h-52 sm:w-52"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hb-leaf">
                Page link
              </p>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-hb-sand bg-hb-fog/60 px-3 py-2.5">
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-hb-ink">
                  {pageUrl}
                </p>
                <button
                  type="button"
                  className="hb-focus grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-hb-action"
                  onClick={async () => {
                    await navigator.clipboard.writeText(pageUrl);
                    flash("Link copied");
                  }}
                  aria-label="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-hb-sand bg-hb-fog/40 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-hb-ink">Offline</p>
                <p className="text-xs text-hb-leaf">
                  Show a lightweight offline-ready card when toggled
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={offline}
                disabled={pending}
                onClick={toggleOffline}
                className={cn(
                  "relative h-8 w-14 rounded-full transition",
                  offline ? "bg-hb-action" : "bg-hb-sand"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition",
                    offline ? "left-7" : "left-1"
                  )}
                />
              </button>
            </div>

            {quickShare ? (
              <p className="text-xs text-hb-action">
                Quick Share:{" "}
                <strong>
                  {quickShare === "text" ? "Share as Text" : "Share as Email"}
                </strong>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-xl text-hb-ink">Share options</h2>
          <QrCode className="h-4 w-4 text-hb-leaf" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => runAction(opt.action)}
                className="flex min-h-[108px] flex-col items-start justify-between rounded-2xl border border-hb-sand/80 bg-white p-4 text-left shadow-soft transition hover:border-hb-action/35 hover:shadow-lift"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-hb-mist text-hb-action">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-3 text-sm font-semibold leading-snug text-hb-ink">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-8">
        <Button
          className="h-12 w-full sm:w-auto"
          onClick={() => setSetupOpen(true)}
        >
          Setup Quick Share
        </Button>
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-hb-ink px-4 py-2 text-sm text-white shadow-lift">
          {toast}
        </div>
      ) : null}

      <Sheet
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        title="Setup Quick Share"
      >
        <p className="text-sm leading-relaxed text-hb-leaf">
          Select your go-to option for sharing this page. We&apos;ll display it
          as a Quick Share button moving forward.
        </p>
        <div className="mt-5 space-y-3">
          {(
            [
              ["text", "Share as Text", "Copies a ready SMS / chat message"],
              ["email", "Share as Email", "Copies a short email signature blurb"],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSetupChoice(value)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition",
                setupChoice === value
                  ? "border-hb-action bg-hb-mist/80"
                  : "border-hb-sand bg-white"
              )}
            >
              <span
                className={cn(
                  "mt-1 grid h-5 w-5 place-items-center rounded-full border-2",
                  setupChoice === value
                    ? "border-hb-action bg-hb-action"
                    : "border-hb-sand"
                )}
              >
                {setupChoice === value ? (
                  <span className="h-2 w-2 rounded-full bg-white" />
                ) : null}
              </span>
              <span>
                <span className="block text-sm font-semibold text-hb-ink">
                  {label}
                </span>
                <span className="mt-0.5 block text-xs text-hb-leaf">{hint}</span>
              </span>
            </button>
          ))}
        </div>
        <Button
          className="mt-6 w-full"
          disabled={pending}
          onClick={saveQuickShare}
        >
          Save and continue
        </Button>
      </Sheet>
    </div>
  );
}
