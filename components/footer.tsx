import Link from "next/link";
import { Camera, MessageCircle, Globe, Video, Music2 } from "lucide-react";
import { getData } from "@/lib/data-server";
import { EditableSiteCopy } from "@/components/edit-mode/editable-site-copy";

const socialIcons = [
  { key: "instagram", icon: Camera },
  { key: "twitter", icon: MessageCircle },
  { key: "facebook", icon: Globe },
  { key: "youtube", icon: Video },
  { key: "spotify", icon: Music2 },
] as const;

export function Footer() {
  const data = getData();
  const copy = data.siteCopy.footer;
  const nav = data.siteCopy.nav;
  const vis = data.pageVisibility ?? {};

  const allFooterLinks = [
    { href: "/music", label: nav.music, key: "music" },
    { href: "/merch", label: nav.merch, key: "merch" },
    { href: "/shows", label: nav.shows, key: "shows" },
    { href: "/about", label: nav.about, key: "about" },
    { href: "/press", label: nav.press, key: "press" },
    { href: "/contact", label: nav.contact, key: "contact" },
  ];

  const footerLinks = allFooterLinks.filter((link) => vis[link.key as keyof typeof vis] !== false);

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <span className="font-display text-3xl tracking-wider text-foreground">
                {data.band.name.toUpperCase()}
              </span>
            </Link>
            <p className="text-sm text-muted max-w-xs">
              <EditableSiteCopy path="footer.tagline" value={copy.tagline} />
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-display text-lg tracking-wide text-foreground mb-4">
              <EditableSiteCopy path="footer.navHeading" value={copy.navHeading} />
            </h3>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-display text-lg tracking-wide text-foreground mb-4">
              <EditableSiteCopy path="footer.socialHeading" value={copy.socialHeading} />
            </h3>
            <div className="flex gap-3">
              {socialIcons.map((social) => {
                const url = data.band.social[social.key as keyof typeof data.band.social];
                if (!url) return null;
                return (
                  <a
                    key={social.key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-background p-3 text-muted hover:text-accent hover:bg-surface-elevated transition-colors"
                    aria-label={social.key}
                  >
                    <social.icon size={18} />
                  </a>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-muted">
              <EditableSiteCopy path="footer.bookingLabel" value={copy.bookingLabel} />{" "}
              <a
                href={`mailto:${data.band.contact.booking}`}
                className="underline hover:text-accent"
              >
                {data.band.contact.booking}
              </a>
            </p>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} {data.band.name}. All rights reserved.
          </p>
          <p className="text-xs text-muted">
            <EditableSiteCopy path="footer.copyrightSuffix" value={copy.copyrightSuffix} />
          </p>
        </div>
      </div>
    </footer>
  );
}
