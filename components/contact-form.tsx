"use client";

import { useState } from "react";
import { useSiteData } from "@/components/data-provider";

export function ContactForm() {
  const data = useSiteData();
  const copy = data.siteCopy.contact.form;
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setForm({ name: "", email: "", subject: "", message: "" });
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-muted">
            {copy.nameLabel}
          </label>
          <input
            id="name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder={copy.namePlaceholder}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-muted">
            {copy.emailLabel}
          </label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder={copy.emailPlaceholder}
          />
        </div>
      </div>
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-muted">
          {copy.subjectLabel}
        </label>
        <select
          id="subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">{copy.subjectOptions.default}</option>
          <option value="booking">{copy.subjectOptions.booking}</option>
          <option value="press">{copy.subjectOptions.press}</option>
          <option value="merch">{copy.subjectOptions.merch}</option>
          <option value="general">{copy.subjectOptions.general}</option>
        </select>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-muted">
          {copy.messageLabel}
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder={copy.messagePlaceholder}
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-accent px-6 py-3 text-sm font-bold text-background transition-all hover:brightness-110 active:scale-[0.98]"
      >
        {sent ? copy.success : copy.button}
      </button>
    </form>
  );
}
