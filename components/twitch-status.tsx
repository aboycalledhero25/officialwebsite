"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface TwitchStatus {
  live: boolean;
  title?: string;
  viewerCount?: number;
  gameName?: string;
  thumbnailUrl?: string;
  loading: boolean;
}

const TwitchContext = createContext<TwitchStatus>({
  live: false,
  loading: true,
});

export function TwitchProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<TwitchStatus>({ live: false, loading: true });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch("/api/twitch/status");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setStatus({ ...data, loading: false });
          }
        } else {
          if (!cancelled) setStatus({ live: false, loading: false });
        }
      } catch {
        if (!cancelled) setStatus({ live: false, loading: false });
      }
    };

    check();
    const interval = setInterval(check, 60000); // Check every 60 seconds
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return <TwitchContext.Provider value={status}>{children}</TwitchContext.Provider>;
}

export function useTwitchStatus() {
  return useContext(TwitchContext);
}
