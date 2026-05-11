"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useSiteData } from "@/components/data-provider";
import { EditableBandField } from "@/components/edit-mode/editable-band-field";
import { useTwitchStatus } from "@/components/twitch-status";

function LiveDot() {
  return (
    <span className="relative ml-1.5 inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
    </span>
  );
}

export function Navigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const data = useSiteData();
  const copy = data.siteCopy.nav;
  const vis = data.pageVisibility ?? {};
  const twitch = useTwitchStatus();

  const allNavLinks = [
    { href: "/", label: copy.home, key: "home" },
    { href: "/music", label: copy.music, key: "music" },
    { href: "/merch", label: copy.merch, key: "merch" },
    { href: "/shows", label: copy.shows, key: "shows" },
    { href: "/about", label: copy.about, key: "about" },
    { href: "/media", label: copy.media, key: "media" },
    { href: "/press", label: copy.press, key: "press" },
    { href: "/contact", label: copy.contact, key: "contact" },
    { href: "/live", label: copy.live, key: "live", showLiveDot: true },
  ];

  const navLinks = allNavLinks.filter((link) => vis[link.key as keyof typeof vis] !== false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2">
          <span className="font-display text-2xl tracking-wider text-foreground transition-colors group-hover:text-accent">
            <EditableBandField field="name" value={data.band.name} />
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <span className="flex items-center">
                {link.label}
                {(link as any).showLiveDot && twitch.live && <LiveDot />}
              </span>
              {pathname === link.href && (
                <motion.span
                  layoutId="activeNav"
                  className="absolute inset-x-2 -bottom-1 h-px bg-accent"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md p-2 text-foreground hover:bg-surface md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border bg-background md:hidden"
          >
            <div className="flex flex-col px-4 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-3 text-base font-medium transition-colors ${
                    pathname === link.href
                      ? "text-accent bg-surface"
                      : "text-muted hover:text-foreground hover:bg-surface"
                  }`}
                >
                  <span className="flex items-center">
                    {link.label}
                    {(link as any).showLiveDot && twitch.live && <LiveDot />}
                  </span>
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
