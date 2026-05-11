"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { ShowCard } from "@/components/show-card";
import { useSiteData } from "@/components/data-provider";
import { EditableText } from "@/components/edit-mode/editable-text";
import { updateSiteCopyPath } from "@/lib/actions";

export function HomeShows() {
  const data = useSiteData();
  const copy = data.siteCopy.home.shows;
  const upcoming = data.shows.filter((s) => s.status === "upcoming").slice(0, 3);

  return (
    <section className="border-t border-border bg-surface py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title={
            <EditableText
              value={copy.heading}
              onSave={(v) => updateSiteCopyPath("home.shows.heading", v)}
            />
          }
          subtitle={
            <EditableText
              value={copy.subtitle}
              onSave={(v) => updateSiteCopyPath("home.shows.subtitle", v)}
            />
          }
        />

        <div className="space-y-4">
          {upcoming.map((show, i) => (
            <ShowCard key={show.id} show={show} index={i} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/shows"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-bold text-foreground transition-all hover:border-accent hover:text-accent"
          >
            <EditableText
              value={copy.cta}
              onSave={(v) => updateSiteCopyPath("home.shows.cta", v)}
            />
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
