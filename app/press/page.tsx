import type { Metadata } from "next";
import { SectionHeading } from "@/components/section-heading";
import { StreamingLinks } from "@/components/streaming-links";
import { getBand, getPressFacts, getSiteMeta, getSiteCopy } from "@/lib/data-server";
import { EditableSiteCopy } from "@/components/edit-mode/editable-site-copy";
import { Download, Mail, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: `Press | ${getSiteMeta().title}`,
  description: getSiteMeta().description,
};

export default function PressPage() {
  const band = getBand();
  const pressFacts = getPressFacts();
  const copy = getSiteCopy().press;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading
        title={
          <EditableSiteCopy path="press.title" value={copy.title} />
        }
        subtitle={
          <EditableSiteCopy path="press.subtitle" value={copy.subtitle} />
        }
      />

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Sidebar */}
        <aside className="space-y-8 lg:col-span-1">
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="font-display text-xl tracking-wide text-accent">
              <EditableSiteCopy path="press.quickFacts" value={copy.quickFacts} />
            </h3>
            <dl className="mt-4 space-y-3">
              {pressFacts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-xs font-bold uppercase tracking-widest text-muted">
                    {fact.label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="font-display text-xl tracking-wide text-accent-secondary">
              <EditableSiteCopy path="press.contact" value={copy.contact} />
            </h3>
            <div className="mt-4 space-y-3">
              <a
                href={`mailto:${band.contact.booking}`}
                className="flex items-center gap-2 text-sm text-foreground hover:text-accent"
              >
                <Mail size={16} />
                {band.contact.booking}
              </a>
              <a
                href={`mailto:${band.contact.press}`}
                className="flex items-center gap-2 text-sm text-foreground hover:text-accent"
              >
                <Mail size={16} />
                {band.contact.press}
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="font-display text-xl tracking-wide text-foreground">
              <EditableSiteCopy path="press.downloads.heading" value={copy.downloads.heading} />
            </h3>
            <p className="mt-2 text-xs text-muted">
              <EditableSiteCopy path="press.downloads.description" value={copy.downloads.description} />
            </p>
            <div className="mt-4 space-y-2">
              <a
                href="#"
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                <Download size={16} />
                <EditableSiteCopy path="press.downloads.photos" value={copy.downloads.photos} />
              </a>
              <a
                href="#"
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                <Download size={16} />
                <EditableSiteCopy path="press.downloads.stagePlot" value={copy.downloads.stagePlot} />
              </a>
              <a
                href="#"
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                <Download size={16} />
                <EditableSiteCopy path="press.downloads.techRider" value={copy.downloads.techRider} />
              </a>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="space-y-10 lg:col-span-2">
          {/* Photos placeholder */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="aspect-[3/2] overflow-hidden rounded-xl border border-border bg-surface">
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-elevated to-background">
                <span className="text-xs uppercase tracking-widest text-muted">
                  <EditableSiteCopy path="press.photoLabels.landscape" value={copy.photoLabels.landscape} />
                </span>
              </div>
            </div>
            <div className="aspect-[2/3] overflow-hidden rounded-xl border border-border bg-surface">
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-elevated to-background">
                <span className="text-xs uppercase tracking-widest text-muted">
                  <EditableSiteCopy path="press.photoLabels.portrait" value={copy.photoLabels.portrait} />
                </span>
              </div>
            </div>
            <div className="aspect-video overflow-hidden rounded-xl border border-border bg-surface sm:col-span-2">
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-elevated to-background">
                <span className="text-xs uppercase tracking-widest text-muted">
                  <EditableSiteCopy path="press.photoLabels.live" value={copy.photoLabels.live} />
                </span>
              </div>
            </div>
          </div>

          {/* Bios */}
          <div className="space-y-8">
            <div>
              <h3 className="font-display text-2xl tracking-wide text-accent">
                <EditableSiteCopy path="press.elevatorPitch" value={copy.elevatorPitch} />
              </h3>
              <div className="mt-3 space-y-4 text-sm leading-relaxed text-foreground">
                {band.bio.elevator.split(/\r?\n\r?\n/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-display text-2xl tracking-wide text-accent">
                <EditableSiteCopy path="press.shortBio" value={copy.shortBio} />
              </h3>
              <div className="mt-3 space-y-4 text-sm leading-relaxed text-foreground">
                {band.bio.short.split(/\r?\n\r?\n/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-display text-2xl tracking-wide text-accent">
                <EditableSiteCopy path="press.fullBio" value={copy.fullBio} />
              </h3>
              <div className="mt-3 space-y-4 text-sm leading-relaxed text-foreground">
                {band.bio.medium.split(/\r?\n\r?\n/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Streaming links */}
          <div>
            <h3 className="font-display text-2xl tracking-wide text-foreground">
              <EditableSiteCopy path="press.listen" value={copy.listen} />
            </h3>
            <div className="mt-4">
              <StreamingLinks />
            </div>
          </div>

          {/* Social links */}
          <div>
            <h3 className="font-display text-2xl tracking-wide text-foreground">
              <EditableSiteCopy path="press.socials" value={copy.socials} />
            </h3>
            <div className="mt-4 flex flex-wrap gap-3">
              {Object.entries(band.social).map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground transition-all hover:border-accent hover:text-accent"
                >
                  {key}
                  <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
