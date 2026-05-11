import type { Metadata } from "next";
import { SectionHeading } from "@/components/section-heading";
import { getVideos, getSiteMeta, getSiteCopy } from "@/lib/data-server";
import { EditableSiteCopy } from "@/components/edit-mode/editable-site-copy";
import { extractYouTubeId } from "@/lib/youtube";
import { Play } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const siteMeta = await getSiteMeta();
  return {
    title: `Media | ${siteMeta.title}`,
    description: siteMeta.description,
  };
}

async function VideoEmbed({ youtubeId, title }: { youtubeId: string; title: string }) {
  const copy = (await getSiteCopy()).media;
  const extractedId = extractYouTubeId(youtubeId);
  const isPlaceholder = youtubeId === "PLACEHOLDER" || !extractedId;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-surface">
      {isPlaceholder ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-surface-elevated to-background">
          <Play size={40} className="text-muted" />
          <span className="text-sm uppercase tracking-widest text-muted">{title}</span>
          <span className="text-xs text-muted">
            <EditableSiteCopy path="media.embedPlaceholder" value={copy.embedPlaceholder} />
          </span>
        </div>
      ) : (
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${extractedId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}

export default async function MediaPage() {
  const videos = await getVideos();
  const copy = (await getSiteCopy()).media;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading
        title={
          <EditableSiteCopy path="media.title" value={copy.title} />
        }
        subtitle={
          <EditableSiteCopy path="media.subtitle" value={copy.subtitle} />
        }
      />

      <div className="space-y-16">
        {videos.map((video) => (
          <div key={video.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent">
                {copy.videoTypes[video.type] ?? video.type}
              </span>
            </div>
            <h3 className="font-display text-2xl tracking-wide text-foreground sm:text-3xl">
              {video.title}
            </h3>
            <VideoEmbed youtubeId={video.youtubeId} title={video.title} />
            <p className="text-sm text-muted">{video.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
