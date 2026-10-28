"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

type Props = {
  label: string;
  hint?: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  kind?: "avatar" | "banner" | "media";
};

export function MediaPicker({
  label,
  hint,
  value,
  onChange,
  kind = "media",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Upload failed");
      return;
    }
    const body = await res.json();
    onChange(body.url);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-hb-forest">{label}</p>
          {hint ? <p className="text-xs text-hb-leaf">{hint}</p> : null}
        </div>
        {value ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-semibold text-hb-danger"
            onClick={() => onChange(null)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        ) : null}
      </div>

      <div
        className={
          kind === "banner"
            ? "relative aspect-[16/7] overflow-hidden rounded-2xl border border-hb-sand bg-hb-fog"
            : "relative mx-auto aspect-square w-28 overflow-hidden rounded-full border border-hb-sand bg-hb-fog"
        }
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-hb-leaf">
            <ImagePlus className="h-6 w-6 opacity-60" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
          {pending ? "Uploading…" : "Upload image"}
        </Button>
      </div>

      <Input
        label="Or paste image URL"
        value={value?.startsWith("data:") ? "" : value ?? ""}
        placeholder="https://…"
        onChange={(e) => onChange(e.target.value || null)}
      />
      {error ? (
        <p className="text-xs text-hb-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
