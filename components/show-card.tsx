"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { useSiteData } from "@/components/data-provider";

interface Show {
  id: string;
  date: string;
  venue: string;
  city: string;
  country: string;
  ticketUrl: string | null;
  status: "upcoming" | "past";
  supporting: string;
}

export function ShowCard({ show, index = 0 }: { show: Show; index?: number }) {
  const data = useSiteData();
  const copy = data.siteCopy.showCard;
  const isPast = show.status === "past";
  const hasTickets = show.ticketUrl && show.ticketUrl !== "#";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`flex flex-col gap-4 rounded-xl border border-border bg-background p-5 sm:flex-row sm:items-center sm:justify-between ${
        isPast ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-surface">
          <span className="text-xs font-bold uppercase tracking-widest text-accent">
            {new Date(show.date).toLocaleDateString("en-GB", { month: "short" })}
          </span>
          <span className="font-display text-xl tracking-wide text-foreground">
            {new Date(show.date).getDate()}
          </span>
        </div>
        <div>
          <h3 className="font-display text-lg tracking-wide text-foreground">
            {show.venue}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted">
            <MapPin size={14} />
            {show.city}, {show.country}
          </div>
          {show.supporting && show.supporting !== "TBA" && (
            <p className="mt-1 text-xs text-muted">
              {copy.supportingPrefix}
              {show.supporting}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isPast ? (
          <span className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted">
            {copy.soldOut}
          </span>
        ) : hasTickets ? (
          <a
            href={show.ticketUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-background transition-all hover:brightness-110"
          >
            <Ticket size={16} />
            {copy.tickets}
          </a>
        ) : (
          <span className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted">
            {copy.onSaleSoon}
          </span>
        )}
      </div>
    </motion.div>
  );
}
