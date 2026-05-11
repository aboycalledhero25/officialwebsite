"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Save, Newspaper } from "lucide-react";
import { SortableList } from "@/components/admin/sortable-list";
import { updatePressFacts, updateBand } from "@/lib/actions";
import { useRouter } from "next/navigation";

interface PressFact {
  label: string;
  value: string;
}

export default function PressAdminPage() {
  const router = useRouter();
  const [band, setBand] = useState<any>(null);
  const [pressFacts, setPressFacts] = useState<PressFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((data) => {
        setBand(data.band);
        setPressFacts(data.pressFacts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (!band) return;
    setSaving(true);
    await updatePressFacts(pressFacts);
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
    setSaving(false);
    router.refresh();
  }, [band, pressFacts, router]);

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
          <h2 className="text-lg font-semibold text-white">Press / EPK</h2>
          <p className="text-sm text-neutral-500">
            Bios, press facts, and booking info.
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

      <Section title="Bios">
        <div className="space-y-4">
          <TextArea
            label="Elevator Pitch"
            value={band.bio.elevator}
            onChange={(v) => setBand({ ...band, bio: { ...band.bio, elevator: v } })}
            rows={2}
          />
          <TextArea
            label="Short Bio"
            value={band.bio.short}
            onChange={(v) => setBand({ ...band, bio: { ...band.bio, short: v } })}
            rows={3}
          />
          <TextArea
            label="Medium Bio"
            value={band.bio.medium}
            onChange={(v) => setBand({ ...band, bio: { ...band.bio, medium: v } })}
            rows={5}
          />
          <TextArea
            label="Long Bio"
            value={band.bio.long}
            onChange={(v) => setBand({ ...band, bio: { ...band.bio, long: v } })}
            rows={8}
          />
        </div>
      </Section>

      <Section title="Press Facts">
        <SortableList
          items={pressFacts.map((f, i) => ({ ...f, id: `fact-${i}` }))}
          onChange={(items) =>
            setPressFacts(items.map(({ id, ...rest }) => rest))
          }
          renderItem={(fact, index) => (
            <div className="flex items-center gap-3">
              <Field
                label=""
                value={fact.label}
                onChange={(v) =>
                  setPressFacts((prev) =>
                    prev.map((f, i) => (i === index ? { ...f, label: v } : f))
                  )
                }
                placeholder="Label"
              />
              <Field
                label=""
                value={fact.value}
                onChange={(v) =>
                  setPressFacts((prev) =>
                    prev.map((f, i) => (i === index ? { ...f, value: v } : f))
                  )
                }
                placeholder="Value"
              />
              <button
                onClick={() =>
                  setPressFacts((prev) => prev.filter((_, i) => i !== index))
                }
                className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        />
        <button
          onClick={() => setPressFacts((prev) => [...prev, { label: "", value: "" }])}
          className="flex items-center gap-2 text-sm text-[#00f0ff] hover:underline mt-3"
        >
          <Plus className="w-4 h-4" />
          Add Fact
        </button>
      </Section>

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
    <div className="flex-1">
      {label && (
        <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
          {label}
        </label>
      )}
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

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] resize-y"
      />
    </div>
  );
}
