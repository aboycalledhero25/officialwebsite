"use client";

import { usePathname } from "next/navigation";
import { User } from "lucide-react";

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

export function AdminHeader() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Admin";

  return (
    <header className="h-16 border-b border-[#1e1e1e] bg-[#0a0a0a] flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
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
