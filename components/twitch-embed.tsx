"use client";

import { useEffect, useState } from "react";
import { useSiteData } from "@/components/data-provider";
import { useTwitchStatus } from "@/components/twitch-status";

export function TwitchEmbed() {
  const data = useSiteData();
  const twitch = useTwitchStatus();
  const [parent, setParent] = useState("localhost");
  const username = data.twitchUsername?.trim();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setParent(window.location.hostname);
    }
  }, []);

  if (!username) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border bg-surface">
        <p className="text-sm text-muted">No Twitch username configured.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {twitch.live && twitch.title && (
        <div className="flex items-center gap-3">
          <span className="relative inline-flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <span className="text-sm font-bold text-red-400">LIVE</span>
          <span className="text-sm text-muted">{twitch.title}</span>
          {twitch.viewerCount !== undefined && (
            <span className="text-xs text-muted">{twitch.viewerCount.toLocaleString()} viewers</span>
          )}
        </div>
      )}
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-surface">
        <iframe
          src={`https://player.twitch.tv/?channel=${encodeURIComponent(username)}&parent=${encodeURIComponent(parent)}&autoplay=${twitch.live ? "true" : "false"}&muted=false`}
          height="100%"
          width="100%"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
