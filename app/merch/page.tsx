import type { Metadata } from "next";
import { SectionHeading } from "@/components/section-heading";
import { MerchCard } from "@/components/merch-card";
import { getMerch, getSiteMeta, getSiteCopy } from "@/lib/data-server";
import { EditableSiteCopy } from "@/components/edit-mode/editable-site-copy";

export async function generateMetadata(): Promise<Metadata> {
  const siteMeta = await getSiteMeta();
  return {
    title: `Merch | ${siteMeta.title}`,
    description: siteMeta.description,
  };
}

export default async function MerchPage() {
  const merch = await getMerch();
  const copy = (await getSiteCopy()).merch;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading
        title={
          <EditableSiteCopy path="merch.title" value={copy.title} />
        }
        subtitle={
          <EditableSiteCopy path="merch.subtitle" value={copy.subtitle} />
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {merch.map((product, i) => (
          <MerchCard key={product.id} product={product} index={i} />
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-border bg-surface p-6 text-center sm:p-10">
        <h3 className="font-display text-2xl tracking-wide text-foreground">
          <EditableSiteCopy path="merch.sizeCta.heading" value={copy.sizeCta.heading} />
        </h3>
        <p className="mt-2 text-muted">
          <EditableSiteCopy path="merch.sizeCta.description" value={copy.sizeCta.description} />
        </p>
        <a
          href="mailto:hello@aboycalledhero.com"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-background transition-all hover:brightness-110"
        >
          <EditableSiteCopy path="merch.sizeCta.button" value={copy.sizeCta.button} />
        </a>
      </div>
    </div>
  );
}
