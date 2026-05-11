"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle } from "lucide-react";
import { useSiteData } from "@/components/data-provider";
import { EditableText } from "@/components/edit-mode/editable-text";
import { updateSiteCopyPath } from "@/lib/actions";

interface MailingListProps {
  variant?: "default" | "compact";
}

export function MailingList({ variant = "default" }: MailingListProps) {
  const data = useSiteData();
  const copy = data.siteCopy.home.mailingList;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("success");
    setEmail("");
    setTimeout(() => setStatus("idle"), 4000);
  };

  if (variant === "compact") {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          required
          placeholder={copy.placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-background transition-all hover:brightness-110"
        >
          <Send size={14} />
          <EditableText
            value={copy.buttonCompact}
            onSave={(v) => updateSiteCopyPath("home.mailingList.buttonCompact", v)}
          />
        </button>
      </form>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border bg-surface p-6 sm:p-10"
    >
      <div className="mx-auto max-w-xl text-center">
        <h3 className="font-display text-3xl tracking-wide text-accent sm:text-4xl">
          <EditableText
            value={copy.heading}
            onSave={(v) => updateSiteCopyPath("home.mailingList.heading", v)}
          />
        </h3>
        <p className="mt-2 text-muted">
          <EditableText
            value={copy.description}
            onSave={(v) => updateSiteCopyPath("home.mailingList.description", v)}
            multiline
          />
        </p>

        {status === "success" ? (
          <div className="mt-6 flex items-center justify-center gap-2 text-accent">
            <CheckCircle size={20} />
            <span className="font-medium">
              <EditableText
                value={copy.success}
                onSave={(v) => updateSiteCopyPath("home.mailingList.success", v)}
              />
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              placeholder={copy.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 font-bold text-background transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Send size={16} />
              <EditableText
                value={copy.buttonFull}
                onSave={(v) => updateSiteCopyPath("home.mailingList.buttonFull", v)}
              />
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
}
