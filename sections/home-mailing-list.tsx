"use client";

import { MailingList } from "@/components/mailing-list";

export function HomeMailingList() {
  return (
    <section className="border-t border-border bg-surface py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <MailingList />
      </div>
    </section>
  );
}
