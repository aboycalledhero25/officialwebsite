import type { Metadata } from "next";
import { SectionHeading } from "@/components/section-heading";
import { ShowCard } from "@/components/show-card";
import { getShows, getSiteMeta, getSiteCopy } from "@/lib/data-server";
import { EditableSiteCopy } from "@/components/edit-mode/editable-site-copy";

export async function generateMetadata(): Promise<Metadata> {
  const siteMeta = await getSiteMeta();
  return {
    title: `Shows | ${siteMeta.title}`,
    description: siteMeta.description,
  };
}

export default async function ShowsPage() {
  const shows = await getShows();
  const copy = (await getSiteCopy()).shows;
  const upcoming = shows.filter((s) => s.status === "upcoming");
  const past = shows.filter((s) => s.status === "past");

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading
        title={
          <EditableSiteCopy path="shows.title" value={copy.title} />
        }
        subtitle={
          <EditableSiteCopy path="shows.subtitle" value={copy.subtitle} />
        }
      />

      <div className="space-y-16">
        <div>
          <h3 className="mb-6 font-display text-2xl tracking-wide text-accent">
            <EditableSiteCopy path="shows.upcomingHeading" value={copy.upcomingHeading} />
          </h3>
          {upcoming.length > 0 ? (
            <div className="space-y-4">
              {upcoming.map((show, i) => (
                <ShowCard key={show.id} show={show} index={i} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
              <p className="text-muted">
                <EditableSiteCopy path="shows.empty.message" value={copy.empty.message} />
              </p>
              <p className="mt-2 text-sm text-muted">
                <EditableSiteCopy path="shows.empty.cta" value={copy.empty.cta} />
              </p>
            </div>
          )}
        </div>

        {past.length > 0 && (
          <div>
            <h3 className="mb-6 font-display text-2xl tracking-wide text-muted">
            <EditableSiteCopy path="shows.pastHeading" value={copy.pastHeading} />
          </h3>
            <div className="space-y-4">
              {past.map((show, i) => (
                <ShowCard key={show.id} show={show} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
