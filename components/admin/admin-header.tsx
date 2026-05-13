"use client";

import { usePathname } from "next/navigation";
import { Menu, User } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/homepage": "Homepage Editor",
  "/admin/music": "Music Editor",
  "/admin/merch": "Merch Editor",
  "/admin/shows": "Shows Editor",
  "/admin/media": "Media / Videos Editor",
  "/admin/about": "About Editor",
  "/admin/press": "Press / EPK Editor",
  "/admin/contact": "Contact Editor",
  "/admin/settings": "Site Settings",
  "/admin/media-library": "Media Library",
};

export function AdminHeader({ onMenuOpen }: { onMenuOpen?: () => void }) {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Admin";

  return (
    <header className="h-14 lg:h-16 border-b border-[#1e1e1e] bg-[#0a0a0a] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {/* Hamburger – mobile only */}
        <button
          onClick={onMenuOpen}
          className="lg:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1e1e1e] transition-colors -ml-1"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base lg:text-lg font-semibold text-white">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <div className="w-7 h-7 rounded-full bg-[#1e1e1e] flex items-center justify-center">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="hidden sm:inline">Admin</span>
        </div>
      </div>
    </header>
  );
}
