"use client";

import { useState, useCallback, useEffect } from "react";
import { Save, Mail } from "lucide-react";
import { updateBand, updateSocialConfig } from "@/lib/actions";
import { useRouter } from "next/navigation";

export default function ContactAdminPage() {
  const router = useRouter();
  const [band, setBand] = useState<any>(null);
  const [instagramHandle, setInstagramHandle] = useState("");
  const [twitchUsername, setTwitchUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((data) => {
        setBand(data.band);
        setInstagramHandle(data.instagramHandle || "");
        setTwitchUsername(data.twitchUsername || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (!band) return;
    setSaving(true);
    const formData = new FormData();
    formData.append("name", band.name);
    formData.append("tagline", band.tagline);
    formData.append("genre", band.genre);
    formData.append("location", band.location);
    formData.append("formed", band.formed);
    formData.append("members", JSON.stringify(band.members));
    formData.append("bio.elevator", band.bio.elevator);
    formData.append("bio.short", band.bio.short);
    formData.append("bio.medium", band.bio.medium);
    formData.append("bio.long", band.bio.long);
    formData.append("social", JSON.stringify(band.social));
    formData.append("contact.booking", band.contact.booking);
    formData.append("contact.press", band.contact.press);
    formData.append("contact.general", band.contact.general);
    await updateBand(formData);
    await updateSocialConfig({ instagramHandle, twitchUsername });
    setSaving(false);
    router.refresh();
  }, [band, instagramHandle, twitchUsername, router]);

  if (loading || !band) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Contact</h2>
          <p className="text-sm text-neutral-500">
            Emails, social links, and platform usernames.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[#00f0ff] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <Section title="Contact Emails">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label="Booking"
            value={band.contact.booking}
            onChange={(v) =>
              setBand({ ...band, contact: { ...band.contact, booking: v } })
            }
          />
          <Field
            label="Press"
            value={band.contact.press}
            onChange={(v) =>
              setBand({ ...band, contact: { ...band.contact, press: v } })
            }
          />
          <Field
            label="General"
            value={band.contact.general}
            onChange={(v) =>
              setBand({ ...band, contact: { ...band.contact, general: v } })
            }
          />
        </div>
      </Section>

      <Section title="Social Links">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(band.social).map(([key, value]) => (
            <Field
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              value={value as string}
              onChange={(v) =>
                setBand({
                  ...band,
                  social: { ...band.social, [key]: v },
                })
              }
            />
          ))}
        </div>
      </Section>

      <Section title="Platform Config">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Instagram Handle"
            value={instagramHandle}
            onChange={setInstagramHandle}
            placeholder="without @"
          />
          <Field
            label="Twitch Username"
            value={twitchUsername}
            onChange={setTwitchUsername}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-5 space-y-4">
      <h3 className="font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
      />
    </div>
  );
}
