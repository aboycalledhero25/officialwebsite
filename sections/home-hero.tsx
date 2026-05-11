"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { useSiteData } from "@/components/data-provider";
import { EditableText } from "@/components/edit-mode/editable-text";
import { updateSiteCopyPath } from "@/lib/actions";

const STORAGE_KEY = "abch-guitar-tuner";

type GradientEdge = "top" | "bottom" | "left" | "right";

interface BannerSettings {
  opacity: number;
  gradientEdge: GradientEdge;
  gradientSize: number;
  gradientOpacity: number;
}

function loadBannerSettings(): BannerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        opacity: parsed.bannerOpacity ?? 1.0,
        gradientEdge: parsed.bannerGradientEdge || "bottom",
        gradientSize: parsed.bannerGradientSize ?? 35,
        gradientOpacity: parsed.bannerGradientOpacity ?? 1.0,
      };
    }
  } catch {}
  return { opacity: 1.0, gradientEdge: "bottom", gradientSize: 35, gradientOpacity: 1.0 };
}

const DEFAULT_BANNER_SETTINGS: BannerSettings = { opacity: 1.0, gradientEdge: "bottom", gradientSize: 35, gradientOpacity: 1.0 };

/** Fades the banner image itself to transparent at the chosen edge so the 3D background shows through */
function getBannerMaskStyle(settings: BannerSettings): React.CSSProperties {
  const s = settings.gradientSize;
  const mask = (dir: string) =>
    `linear-gradient(${dir}, black calc(100% - ${s}%), transparent 100%)`;

  switch (settings.gradientEdge) {
    case "bottom":
      return { maskImage: mask("to bottom"), WebkitMaskImage: mask("to bottom") };
    case "top":
      return { maskImage: mask("to top"), WebkitMaskImage: mask("to top") };
    case "left":
      return { maskImage: mask("to left"), WebkitMaskImage: mask("to left") };
    case "right":
      return { maskImage: mask("to right"), WebkitMaskImage: mask("to right") };
  }
}

/** Optional dark tint overlay for text readability at the faded edge */
function getTintStyle(settings: BannerSettings): React.CSSProperties {
  const rgba = `rgba(10, 10, 10, ${settings.gradientOpacity})`;
  const s = settings.gradientSize;

  switch (settings.gradientEdge) {
    case "bottom":
      return { background: `linear-gradient(to bottom, transparent calc(100% - ${s}%), ${rgba} 100%)` };
    case "top":
      return { background: `linear-gradient(to top, transparent calc(100% - ${s}%), ${rgba} 100%)` };
    case "left":
      return { background: `linear-gradient(to left, transparent calc(100% - ${s}%), ${rgba} 100%)` };
    case "right":
      return { background: `linear-gradient(to right, transparent calc(100% - ${s}%), ${rgba} 100%)` };
  }
}

export function HomeHero({ hotspot }: { hotspot?: ReactNode }) {
  const data = useSiteData();
  const copy = data.siteCopy.home.hero;
  const hasBanner = data.bannerImage && !data.bannerImage.includes("placeholder");

  const [settings, setSettings] = useState<BannerSettings>(DEFAULT_BANNER_SETTINGS);

  const refresh = useCallback((e?: Event) => {
    const detail = e ? (e as CustomEvent).detail : null;
    if (detail) {
      setSettings({
        opacity: detail.bannerOpacity ?? 1.0,
        gradientEdge: detail.bannerGradientEdge || "bottom",
        gradientSize: detail.bannerGradientSize ?? 35,
        gradientOpacity: detail.bannerGradientOpacity ?? 1.0,
      });
    } else {
      setSettings(loadBannerSettings());
    }
  }, []);

  useEffect(() => {
    setSettings(loadBannerSettings());
    window.addEventListener("tuner-update", refresh as EventListener);
    return () => window.removeEventListener("tuner-update", refresh as EventListener);
  }, [refresh]);

  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      {hasBanner ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${data.bannerImage})`,
              opacity: settings.opacity,
              ...getBannerMaskStyle(settings),
            }}
          />
          {/* Optional dark tint — masked so it only covers the banner, not the 3D bg */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              ...getTintStyle(settings),
              ...getBannerMaskStyle(settings),
            }}
          />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/5 via-background to-background" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
        </>
      )}

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8 lg:py-36">
        {hotspot}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <EditableText
            value={copy.announcement}
            onSave={(v) => updateSiteCopyPath("home.hero.announcement", v)}
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-6 font-display text-6xl tracking-wider text-foreground sm:text-7xl md:text-8xl lg:text-9xl"
        >
          {data.band.name.toUpperCase()}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 max-w-xl text-lg text-muted sm:text-xl"
        >
          <EditableText
            value={data.band.tagline}
            onSave={(v) => updateSiteCopyPath("band.tagline", v)}
          />
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-col gap-4 sm:flex-row"
        >
          <Link
            href="/music"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-3.5 text-base font-bold text-background transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Play size={18} />
            <EditableText
              value={copy.ctaListen}
              onSave={(v) => updateSiteCopyPath("home.hero.ctaListen", v)}
            />
          </Link>
          <Link
            href="/merch"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-8 py-3.5 text-base font-bold text-foreground transition-all hover:border-accent hover:text-accent"
          >
            <EditableText
              value={copy.ctaMerch}
              onSave={(v) => updateSiteCopyPath("home.hero.ctaMerch", v)}
            />
            <ArrowRight size={18} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
