"use client";

import { useEffect, useState } from "react";
import { useSiteData } from "@/components/data-provider";

export function TwitchChat() {
  const data = useSiteData();
  const [parent, setParent] = useState("localhost");
  const username = data.twitchUsername?.trim();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setParent(window.location.hostname);
    }
  }, []);

  if (!username) {
    return null;
  }

  return (
    <div className="h-full min-h-[400px] overflow-hidden rounded-xl border border-border bg-surface">
      <iframe
        src={`https://www.twitch.tv/embed/${encodeURIComponent(username)}/chat?parent=${encodeURIComponent(parent)}&darkpopout`}
        height="100%"
        width="100%"
        className="h-full w-full min-h-[400px]"
      />
    </div>
  );
}
