import type { Metadata } from "next";
import { SectionHeading } from "@/components/section-heading";
import { ContactForm } from "@/components/contact-form";
import { getBand, getSiteMeta, getSiteCopy } from "@/lib/data-server";
import { EditableSiteCopy } from "@/components/edit-mode/editable-site-copy";
import { Mail, Camera, MessageCircle, Video, Music2 } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const siteMeta = await getSiteMeta();
  const band = await getBand();
  return {
    title: `Contact | ${siteMeta.title}`,
    description: band.bio.short,
  };
}

export default async function ContactPage() {
  const band = await getBand();
  const copy = (await getSiteCopy()).contact;

  const socials = [
    { href: band.social.instagram, icon: Camera, label: copy.socials.instagram },
    { href: band.social.twitter, icon: MessageCircle, label: copy.socials.twitter },
    { href: band.social.youtube, icon: Video, label: copy.socials.youtube },
    { href: band.social.spotify, icon: Music2, label: copy.socials.spotify },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading
        title={
          <EditableSiteCopy path="contact.title" value={copy.title} />
        }
        subtitle={
          <EditableSiteCopy path="contact.subtitle" value={copy.subtitle} />
        }
      />

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Contact form */}
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h3 className="font-display text-2xl tracking-wide text-foreground">
            <EditableSiteCopy path="contact.form.heading" value={copy.form.heading} />
          </h3>
          <ContactForm />
        </div>

        {/* Contact info */}
        <div className="space-y-8">
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <h3 className="font-display text-2xl tracking-wide text-foreground">
              <EditableSiteCopy path="contact.email.heading" value={copy.email.heading} />
            </h3>
            <div className="mt-6 space-y-4">
              <a
                href={`mailto:${band.contact.booking}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 transition-colors hover:border-accent"
              >
                <Mail size={20} className="text-accent" />
                <div>
                  <span className="block text-xs font-bold uppercase tracking-widest text-muted">
                    <EditableSiteCopy path="contact.email.bookingLabel" value={copy.email.bookingLabel} />
                  </span>
                  <span className="text-sm text-foreground">{band.contact.booking}</span>
                </div>
              </a>
              <a
                href={`mailto:${band.contact.press}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 transition-colors hover:border-accent"
              >
                <Mail size={20} className="text-accent-secondary" />
                <div>
                  <span className="block text-xs font-bold uppercase tracking-widest text-muted">
                    <EditableSiteCopy path="contact.email.pressLabel" value={copy.email.pressLabel} />
                  </span>
                  <span className="text-sm text-foreground">{band.contact.press}</span>
                </div>
              </a>
              <a
                href={`mailto:${band.contact.general}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 transition-colors hover:border-accent"
              >
                <Mail size={20} className="text-accent-tertiary" />
                <div>
                  <span className="block text-xs font-bold uppercase tracking-widest text-muted">
                    <EditableSiteCopy path="contact.email.generalLabel" value={copy.email.generalLabel} />
                  </span>
                  <span className="text-sm text-foreground">{band.contact.general}</span>
                </div>
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <h3 className="font-display text-2xl tracking-wide text-foreground">
            <EditableSiteCopy path="contact.socials.heading" value={copy.socials.heading} />
          </h3>
            <div className="mt-6 flex flex-wrap gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground transition-all hover:border-accent hover:text-accent"
                >
                  <s.icon size={16} />
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
