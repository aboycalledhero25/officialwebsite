"use client";

import { Music2, PlayCircle, Radio, Disc3 } from "lucide-react";
import { useSiteData } from "@/components/data-provider";

interface StreamingLinksProps {
  releaseId?: string;
  className?: string;
}

export function StreamingLinks({ releaseId, className = "" }: StreamingLinksProps) {
  const data = useSiteData();
  const copy = data.siteCopy.streamingLinks;
  const release = releaseId
    ? data.releases.find((r) => r.id === releaseId)
    : undefined;

  const links = release
    ? [
        { href: release.spotifyUrl, icon: Music2, label: copy.spotify },
        { href: release.appleMusicUrl, icon: PlayCircle, label: copy.appleMusic },
        { href: release.youtubeUrl, icon: Radio, label: copy.youtube },
        { href: release.bandcampUrl, icon: Disc3, label: copy.bandcamp },
      ]
    : [
        { href: data.band.social.spotify, icon: Music2, label: copy.spotify },
        { href: data.band.social.appleMusic, icon: PlayCircle, label: copy.appleMusic },
        { href: data.band.social.youtube, icon: Radio, label: copy.youtube },
        { href: data.band.social.bandcamp, icon: Disc3, label: copy.bandcamp },
      ];

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-accent hover:text-accent hover:shadow-[0_0_12px_rgba(0,240,255,0.15)]"
        >
          <link.icon size={16} />
          {link.label}
        </a>
      ))}
    </div>
  );
}
