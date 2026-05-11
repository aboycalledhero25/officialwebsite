"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { MerchCard } from "@/components/merch-card";
import { useSiteData } from "@/components/data-provider";
import { EditableText } from "@/components/edit-mode/editable-text";
import { updateSiteCopyPath } from "@/lib/actions";

export function HomeMerchPreview() {
  const data = useSiteData();
  const copy = data.siteCopy.home.merch;
  const previewItems = data.merch.slice(0, 3);

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title={
            <EditableText
              value={copy.heading}
              onSave={(v) => updateSiteCopyPath("home.merch.heading", v)}
            />
          }
          subtitle={
            <EditableText
              value={copy.subtitle}
              onSave={(v) => updateSiteCopyPath("home.merch.subtitle", v)}
            />
          }
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {previewItems.map((product, i) => (
            <MerchCard key={product.id} product={product} index={i} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/merch"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-sm font-bold text-foreground transition-all hover:border-accent hover:text-accent"
          >
            <EditableText
              value={copy.cta}
              onSave={(v) => updateSiteCopyPath("home.merch.cta", v)}
            />
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
