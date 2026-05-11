import type { Metadata } from "next";
import { SectionHeading } from "@/components/section-heading";
import { AboutImageCollage } from "@/components/about-image-collage";
import { getBand, getSiteMeta, getForFansOf, getSiteCopy, getAboutImages } from "@/lib/data-server";
import { Guitar } from "lucide-react";
import { EditableSiteCopy } from "@/components/edit-mode/editable-site-copy";

export const metadata: Metadata = {
  title: `About | ${getSiteMeta().title}`,
  description: getBand().bio.short,
};

export default function AboutPage() {
  const band = getBand();
  const copy = getSiteCopy().about;
  const aboutImages = getAboutImages();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading
        title={
          <EditableSiteCopy path="about.title" value={copy.title} />
        }
        subtitle={
          <EditableSiteCopy path="about.subtitle" value={copy.subtitle} />
        }
      />

      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <AboutImageCollage images={aboutImages} columns={2} gap="medium" />

        {/* Bio */}
        <div className="space-y-8">
          <div>
            <h3 className="font-display text-2xl tracking-wide text-accent">
              <EditableSiteCopy path="about.bioHeading" value={copy.bioHeading} />
            </h3>
            <div className="mt-4 space-y-4 leading-relaxed text-muted">
              {band.bio.long.split(/\r?\n\r?\n/).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {band.members.map((member) => (
              <div
                key={member.name}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <Guitar size={20} className="text-accent-secondary" />
                <h4 className="mt-3 font-display text-xl tracking-wide text-foreground">
                  {member.name}
                </h4>
                <p className="mt-1 text-sm text-muted">{member.role}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h4 className="font-display text-lg tracking-wide text-foreground">
              <EditableSiteCopy path="about.fansHeading" value={copy.fansHeading} />
            </h4>
            <p className="mt-2 text-sm text-muted">{getForFansOf()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
