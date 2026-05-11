"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { StreamingLinks } from "@/components/streaming-links";
import { useSiteData } from "@/components/data-provider";
import { EditableText } from "@/components/edit-mode/editable-text";
import { updateSiteCopyPath, updateReleases } from "@/lib/actions";
import { EditableImage } from "@/components/edit-mode/editable-image";

export function HomeMusic() {
  const data = useSiteData();
  const copy = data.siteCopy.home.music;
  const single = data.releases[0];

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title={
            <EditableText
              value={copy.heading}
              onSave={(v) => updateSiteCopyPath("home.music.heading", v)}
            />
          }
          subtitle={
            <EditableText
              value={copy.subtitle}
              onSave={(v) => updateSiteCopyPath("home.music.subtitle", v)}
            />
          }
        />

        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          {/* Artwork */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface"
          >
            {single.artwork && !single.artwork.includes("placeholder") ? (
              <EditableImage
                src={single.artwork}
                alt={`${single.title} artwork`}
                imgClassName="h-full w-full object-cover"
                onChange={async (src) => {
                  const updated = data.releases.map((r) =>
                    r.id === single.id ? { ...r, artwork: src } : r
                  );
                  await updateReleases(updated);
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-elevated to-background">
                <span className="text-center">
                  <span className="block font-display text-3xl tracking-wide text-foreground">
                    {single.title}
                  </span>
                  <span className="mt-2 block text-sm uppercase tracking-widest text-muted">
                    {copy.artworkLabel}
                  </span>
                </span>
              </div>
            )}
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="space-y-6"
          >
            <div>
              <span className="text-sm font-bold uppercase tracking-widest text-accent-secondary">
                {single.type}
              </span>
              <h3 className="mt-2 font-display text-4xl tracking-wide text-foreground sm:text-5xl">
                {single.title}
              </h3>
              <p className="mt-3 text-muted leading-relaxed">{single.description}</p>
            </div>

            <StreamingLinks releaseId={single.id} />

            <Link
              href="/music"
              className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline"
            >
              <EditableText
                value={copy.readLyrics}
                onSave={(v) => updateSiteCopyPath("home.music.readLyrics", v)}
              />
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
