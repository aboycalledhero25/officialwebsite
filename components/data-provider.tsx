"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";
import type { SiteData } from "@/lib/data";

const DataContext = createContext<SiteData | null>(null);

export function DataProvider({
  initialData,
  children,
}: {
  initialData: SiteData;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<SiteData>(initialData);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/data", { cache: "no-store" });
      if (!res.ok) return;
      const fresh = await res.json();
      setData(fresh);
    } catch {
      // silent fail
    }
  }, []);

  // Refresh when route changes (catches admin edits when navigating between pages)
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  // Refresh when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refresh]);

  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}

export function useSiteData(): SiteData {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useSiteData must be used within a DataProvider");
  }
  return ctx;
}
