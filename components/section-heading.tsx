"use client";

import { motion } from "framer-motion";

interface SectionHeadingProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  accent?: "primary" | "secondary";
}

export function SectionHeading({ title, subtitle, accent = "primary" }: SectionHeadingProps) {
  const accentColor = accent === "primary" ? "text-accent" : "text-accent-secondary";
  return (
    <div className="mb-8 md:mb-12">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className={`font-display text-4xl tracking-wide sm:text-5xl md:text-6xl ${accentColor}`}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-3 text-lg text-muted max-w-2xl"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
