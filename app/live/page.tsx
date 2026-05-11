import type { Metadata } from "next";
import { SectionHeading } from "@/components/section-heading";
import { getSiteMeta, getSiteCopy } from "@/lib/data-server";
import { EditableSiteCopy } from "@/components/edit-mode/editable-site-copy";
import { TwitchEmbed } from "@/components/twitch-embed";
import { TwitchChat } from "@/components/twitch-chat";

export async function generateMetadata(): Promise<Metadata> {
  const siteMeta = await getSiteMeta();
  return {
    title: `Live | ${siteMeta.title}`,
    description: "Watch A Boy Called Hero live on Twitch.",
  };
}

export default async function LivePage() {
  const copy = (await getSiteCopy()).live;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading
        title={
          <EditableSiteCopy path="live.title" value={copy.title} />
        }
        subtitle={
          <EditableSiteCopy path="live.subtitle" value={copy.subtitle} />
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Video + offline card */}
        <div className="space-y-8">
          <TwitchEmbed />

          <div className="rounded-xl border border-border bg-surface p-6 text-center sm:p-10">
            <h3 className="font-display text-2xl tracking-wide text-foreground">
              <EditableSiteCopy path="live.offlineTitle" value={copy.offlineTitle} />
            </h3>
            <p className="mt-2 text-muted">
              <EditableSiteCopy path="live.offlineSubtitle" value={copy.offlineSubtitle} />
            </p>
            <a
              href={`https://twitch.tv/${copy.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-background transition-all hover:brightness-110"
            >
              <EditableSiteCopy path="live.followButton" value={copy.followButton} />
            </a>
          </div>
        </div>

        {/* Chat */}
        <div className="min-h-[400px] lg:min-h-0">
          <TwitchChat />
        </div>
      </div>
    </div>
  );
}
