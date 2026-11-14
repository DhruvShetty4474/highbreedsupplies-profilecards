"use client";

import { Button } from "@/components/ui/button";
import { uploadMedia, type UploadKind } from "@/lib/upload-client";
import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

const ACCEPT = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4,video/webm",
} as const;

/** Upload one (or several, for galleries) files and hand back their URLs. */
export function BlockUploadButton({
  kind,
  multiple = false,
  forUserId,
  label,
  onUploaded,
}: {
  kind: Extract<UploadKind, "image" | "video">;
  multiple?: boolean;
  forUserId?: string;
  label: string;
  onUploaded: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setError(null);
    const urls: string[] = [];
    try {
      for (const [i, file] of files.entries()) {
        setProgress(files.length > 1 ? `Uploading ${i + 1}/${files.length}…` : "Uploading…");
        urls.push(await uploadMedia(file, kind, forUserId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      if (urls.length) onUploaded(urls);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        multiple={multiple}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={Boolean(progress)}
        onClick={() => inputRef.current?.click()}
      >
        {progress ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {progress ?? label}
      </Button>
      {error ? (
        <p className="text-xs text-hb-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
