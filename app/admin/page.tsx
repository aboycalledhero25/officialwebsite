import Link from "next/link";
import {
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
  Gamepad2,
} from "lucide-react";
import { getData } from "@/lib/data-server";

const sections = [
  {
    href: "/admin/homepage",
    label: "Homepage",
    description: "Hero, featured release, news, merch & shows previews",
    icon: Home,
    color: "text-[#00f0ff]",
    bg: "bg-[#00f0ff]/10",
  },
  {
    href: "/admin/music",
    label: "Music",
    description: "Releases, songs, lyrics, streaming links",
    icon: Music,
    color: "text-[#ff006e]",
    bg: "bg-[#ff006e]/10",
  },
  {
    href: "/admin/merch",
    label: "Merch",
    description: "Products, prices, variants, Shopify handles",
    icon: ShoppingBag,
    color: "text-[#fcee0a]",
    bg: "bg-[#fcee0a]/10",
  },
  {
    href: "/admin/shows",
    label: "Shows",
    description: "Upcoming gigs, past shows, ticket links",
    icon: Calendar,
    color: "text-[#00f0ff]",
    bg: "bg-[#00f0ff]/10",
  },
  {
    href: "/admin/media",
    label: "Media / Videos",
    description: "YouTube embeds, thumbnails, categories",
    icon: Video,
    color: "text-[#ff006e]",
    bg: "bg-[#ff006e]/10",
  },
  {
    href: "/admin/about",
    label: "About",
    description: "Band story, members, photos, influences",
    icon: Users,
    color: "text-[#fcee0a]",
    bg: "bg-[#fcee0a]/10",
  },
  {
    href: "/admin/press",
    label: "Press / EPK",
    description: "Bios, press photos, facts, quotes, downloads",
    icon: Newspaper,
    color: "text-[#00f0ff]",
    bg: "bg-[#00f0ff]/10",
  },
  {
    href: "/admin/contact",
    label: "Contact",
    description: "Emails, social links, form settings",
    icon: Mail,
    color: "text-[#ff006e]",
    bg: "bg-[#ff006e]/10",
  },
  {
    href: "/admin/secret-game",
    label: "Secret Game",
    description: "Hidden Guitar Invaders mini game & hotspot",
    icon: Gamepad2,
    color: "text-[#ff006e]",
    bg: "bg-[#ff006e]/10",
  },
  {
    href: "/admin/settings",
    label: "Site Settings",
    description: "SEO, navigation, footer, branding",
    icon: Settings,
    color: "text-[#fcee0a]",
    bg: "bg-[#fcee0a]/10",
  },
  {
    href: "/admin/media-library",
    label: "Media Library",
    description: "Upload, browse, and manage all images",
    icon: Image,
    color: "text-[#00f0ff]",
    bg: "bg-[#00f0ff]/10",
  },
];

export default async function AdminDashboardPage() {
  const data = await getData();
  const counts = {
    releases: data.releases.length,
    merch: data.merch.length,
    shows: data.shows.length,
    videos: data.videos.length,
    aboutImages: data.aboutImages.length,
    news: data.newsItems.length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
        <p className="text-sm text-neutral-400 mt-1">
          Manage your band website content from one place.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Releases" value={counts.releases} />
        <StatCard label="Merch" value={counts.merch} />
        <StatCard label="Shows" value={counts.shows} />
        <StatCard label="Videos" value={counts.videos} />
        <StatCard label="News" value={counts.news} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group flex items-start gap-4 rounded-xl border border-[#1e1e1e] bg-[#141414] p-5 transition-colors hover:border-[#2a2a2a] hover:bg-[#1a1a1a]"
            >
              <div
                className={`w-10 h-10 rounded-lg ${section.bg} flex items-center justify-center shrink-0`}
              >
                <Icon className={`w-5 h-5 ${section.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-white group-hover:text-[#00f0ff] transition-colors">
                  {section.label}
                </h3>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  {section.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-5">
        <h3 className="font-semibold text-white mb-2">Quick Tips</h3>
        <ul className="space-y-2 text-sm text-neutral-400">
          <li className="flex gap-2">
            <span className="text-[#00f0ff]">•</span>
            <span>
              Visit any public page while logged in to edit content inline — just
              look for the edit controls.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#00f0ff]">•</span>
            <span>
              Upload images in the Media Library first, then select them when
              editing pages.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#00f0ff]">•</span>
            <span>
              All changes save instantly. There is no separate publish step — the
              site updates immediately.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{label}</p>
    </div>
  );
}
