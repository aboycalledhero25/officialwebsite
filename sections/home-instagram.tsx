"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { useSiteData } from "@/components/data-provider";
import { EditableText } from "@/components/edit-mode/editable-text";
import { updateSiteCopyPath } from "@/lib/actions";

function injectEmbedScripts(container: HTMLDivElement, html: string) {
  // Set the HTML first (scripts won't execute)
  container.innerHTML = html;

  // Find all scripts and manually re-create + execute them
  const scripts = container.querySelectorAll("script");
  scripts.forEach((oldScript) => {
    const newScript = document.createElement("script");
    if (oldScript.src) {
      newScript.src = oldScript.src;
    } else {
      newScript.textContent = oldScript.textContent;
    }
    if (oldScript.type) newScript.type = oldScript.type;
    oldScript.parentNode?.replaceChild(newScript, oldScript);
  });
}

export function HomeInstagram() {
  const data = useSiteData();
  const copy = data.siteCopy.home.instagram;
  const handle = data.instagramHandle;
  const posts = data.instagramPosts;
  const embedCode = data.instagramEmbedCode;
  const embedRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && embedRef.current && embedCode) {
      injectEmbedScripts(embedRef.current, embedCode);
    }
  }, [mounted, embedCode]);

  const hasRealPosts = posts.some((p: any) => p.image && !p.image.includes("placeholder"));
  const hasEmbed = embedCode && embedCode.trim().length > 0;

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="text-accent-secondary" size={24} />
            <h2 className="font-display text-3xl tracking-wide text-foreground sm:text-4xl">
              <EditableText
                value={copy.heading}
                onSave={(v) => updateSiteCopyPath("home.instagram.heading", v)}
              />
            </h2>
          </div>
          <a
            href={`https://instagram.com/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-accent hover:underline"
          >
            <EditableText
              value={copy.followLink}
              onSave={(v) => updateSiteCopyPath("home.instagram.followLink", v)}
            />
          </a>
        </div>

        {hasEmbed ? (
          <div ref={embedRef} className="instagram-embed">
            {!mounted && (
              <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border bg-surface">
                <span className="text-sm text-muted">Loading Instagram feed...</span>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-6">
              {posts.map((post: any, i: number) => (
                <motion.a
                  key={post.id}
                  href={post.url || `https://instagram.com/${handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-surface"
                >
                  {post.image ? (
                    <img
                      src={post.image}
                      alt={post.caption || `Instagram post ${i + 1}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-elevated to-background transition-transform duration-500 group-hover:scale-105">
                      <Camera size={24} className="text-muted transition-colors group-hover:text-accent" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-accent/10 opacity-0 transition-opacity group-hover:opacity-100" />
                </motion.a>
              ))}
            </div>

            {!hasRealPosts && (
              <p className="mt-4 text-center text-xs text-muted">
                <EditableText
                  value={copy.emptyMessage}
                  onSave={(v) => updateSiteCopyPath("home.instagram.emptyMessage", v)}
                />
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
