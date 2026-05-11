"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Home,
  Music,
  ShoppingBag,
  Calendar,
  Video,
  Users,
  Newspaper,
  Mail,
  Settings,
  Image,
  LogOut,
  Music2,
  Gamepad2,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/homepage", label: "Homepage", icon: Home },
  { href: "/admin/music", label: "Music", icon: Music },
  { href: "/admin/merch", label: "Merch", icon: ShoppingBag },
  { href: "/admin/shows", label: "Shows", icon: Calendar },
  { href: "/admin/media", label: "Media / Videos", icon: Video },
  { href: "/admin/about", label: "About", icon: Users },
  { href: "/admin/press", label: "Press / EPK", icon: Newspaper },
  { href: "/admin/contact", label: "Contact", icon: Mail },
  { href: "/admin/secret-game", label: "Secret Game", icon: Gamepad2 },
  { href: "/admin/settings", label: "Site Settings", icon: Settings },
  { href: "/admin/media-library", label: "Media Library", icon: Image },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-[#1e1e1e] bg-[#0a0a0a] flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-[#1e1e1e]">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00f0ff]/10 flex items-center justify-center text-[#00f0ff]">
            <Music2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">
              ABCH Admin
            </p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
              Content Portal
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-[#00f0ff]/10 text-[#00f0ff] font-medium"
                  : "text-neutral-400 hover:text-white hover:bg-[#1e1e1e]"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#1e1e1e]">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-[#1e1e1e] transition-colors mb-1"
        >
          <Home className="w-4 h-4 shrink-0" />
          <span>View Website</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
