import type { Metadata } from "next";
import { SectionHeading } from "@/components/section-heading";
import { StreamingLinks } from "@/components/streaming-links";
import { MusicEmbed } from "@/components/music-embed";
import { getReleases, getSiteMeta, getSiteCopy } from "@/lib/data-server";
import { EditableSiteCopy } from "@/components/edit-mode/editable-site-copy";
import { EditableReleaseImage } from "@/components/edit-mode/editable-release-field";

export const metadata: Metadata = {
  title: `Music | ${getSiteMeta().title}`,
  description: getSiteMeta().description,
};

export default function MusicPage() {
  const single = getReleases()[0];
  const copy = getSiteCopy().music;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading
        title={
          <EditableSiteCopy path="music.title" value={copy.title} />
        }
        subtitle={
          <EditableSiteCopy path="music.subtitle" value={copy.subtitle} />
        }
      />

      {/* Featured Release */}
      <div className="grid gap-10 md:grid-cols-2 md:items-start">
        <div className="space-y-6">
          <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-surface">
            {single.artwork && !single.artwork.includes("placeholder") ? (
              <EditableReleaseImage
                id={single.id}
                src={single.artwork}
                alt={`${single.title} artwork`}
                imgClassName="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-elevated to-background">
                <span className="text-center">
                  <span className="block font-display text-3xl tracking-wide text-foreground">
                    {single.title}
                  </span>
                  <span className="mt-2 block text-sm uppercase tracking-widest text-muted">
                    <EditableSiteCopy path="music.artworkLabel" value={copy.artworkLabel} />
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            {single.embedUrl ? (
              <MusicEmbed embedUrl={single.embedUrl} />
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg bg-background text-sm text-muted">
                <span>
                  <EditableSiteCopy path="music.noEmbed" value={copy.noEmbed} />
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <span className="text-sm font-bold uppercase tracking-widest text-accent">
              {single.type} — {new Date(single.releaseDate).getFullYear()}
            </span>
            <h2 className="mt-2 font-display text-4xl tracking-wide text-foreground sm:text-5xl">
              {single.title}
            </h2>
            <p className="mt-4 leading-relaxed text-muted">{single.description}</p>
          </div>

          <StreamingLinks releaseId={single.id} />

          <div className="space-y-4">
            <h3 className="font-display text-2xl tracking-wide text-accent">
              <EditableSiteCopy path="music.lyricsHeading" value={copy.lyricsHeading} />
            </h3>
            <pre className="whitespace-pre-wrap rounded-xl border border-border bg-surface p-6 font-sans text-sm leading-relaxed text-foreground">
              {single.lyrics}
            </pre>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-2xl tracking-wide text-accent-secondary">
              <EditableSiteCopy path="music.meaningHeading" value={copy.meaningHeading} />
            </h3>
            <p className="leading-relaxed text-muted">{single.meaning}</p>
          </div>
        </div>
      </div>

      {/* Future releases structure */}
      <div className="mt-20 border-t border-border pt-16">
        <h3 className="font-display text-3xl tracking-wide text-foreground sm:text-4xl">
          <EditableSiteCopy path="music.comingSoon.heading" value={copy.comingSoon.heading} />
        </h3>
        <p className="mt-2 text-muted">
          <EditableSiteCopy path="music.comingSoon.description" value={copy.comingSoon.description} />
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {copy.comingSoon.items.map((title: string) => (
            <div
              key={title}
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-8 text-center opacity-60"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-muted">
                {copy.comingSoon.yearLabel}
              </span>
              <span className="mt-2 font-display text-xl tracking-wide text-foreground">
                {title}
              </span>
              <span className="mt-1 text-xs text-muted">{copy.comingSoon.tbaLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
