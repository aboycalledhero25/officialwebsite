"use client";

import { motion } from "framer-motion";
import { Megaphone } from "lucide-react";
import { useSiteData } from "@/components/data-provider";
import { EditableText } from "@/components/edit-mode/editable-text";
import { updateSiteCopyPath } from "@/lib/actions";

export function HomeNews() {
  const data = useSiteData();
  const copy = data.siteCopy.home.news;

  return (
    <section className="border-t border-border bg-surface py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <Megaphone className="text-accent" size={24} />
          <h2 className="font-display text-3xl tracking-wide text-foreground sm:text-4xl">
            <EditableText
              value={copy.heading}
              onSave={(v) => updateSiteCopyPath("home.news.heading", v)}
            />
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {data.newsItems.map((item, i) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-xl border border-border bg-background p-6 transition-colors hover:border-accent/20"
            >
              <time className="text-xs font-bold uppercase tracking-widest text-accent">
                {new Date(item.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
              <h3 className="mt-2 font-display text-xl tracking-wide text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
