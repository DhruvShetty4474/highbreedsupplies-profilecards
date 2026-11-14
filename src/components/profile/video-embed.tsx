import { parseYouTubeId, youTubeEmbedUrl } from "@/lib/youtube";

/** YouTube → privacy-enhanced iframe; uploaded MP4/WebM → <video>. */
export function VideoEmbed({
  url,
  title,
  preview = false,
}: {
  url: string;
  title?: string;
  preview?: boolean;
}) {
  const yt = parseYouTubeId(url);
  if (yt) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={youTubeEmbedUrl(yt)}
          title={title || "Video"}
          className={`absolute inset-0 h-full w-full ${preview ? "pointer-events-none" : ""}`}
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  return (
    <video
      className="aspect-video w-full rounded-xl object-cover"
      controls={!preview}
      muted={preview}
      playsInline
      preload="metadata"
    >
      <source src={url} />
    </video>
  );
}
