"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Save, Users, ImageIcon } from "lucide-react";
import { SortableList } from "@/components/admin/sortable-list";
import { updateBand, updateAboutImages, uploadImage } from "@/lib/actions";
import { useRouter } from "next/navigation";

interface BandMember {
  name: string;
  role: string;
}

interface AboutImage {
  src: string;
  alt: string;
  span?: "square" | "wide" | "tall" | "large";
}

export default function AboutAdminPage() {
  const router = useRouter();
  const [band, setBand] = useState<any>(null);
  const [aboutImages, setAboutImages] = useState<AboutImage[]>([]);
  const [forFansOf, setForFansOf] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((data) => {
        setBand(data.band);
        setAboutImages(data.aboutImages || []);
        setForFansOf(data.forFansOf || "");
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
    await updateAboutImages(aboutImages);
    setSaving(false);
    router.refresh();
  }, [band, aboutImages, router]);

  const updateMember = useCallback((index: number, updates: Partial<BandMember>) => {
    setBand((prev: any) => {
      const members = [...prev.members];
      members[index] = { ...members[index], ...updates };
      return { ...prev, members };
    });
  }, []);

  const addMember = useCallback(() => {
    setBand((prev: any) => ({
      ...prev,
      members: [...prev.members, { name: "", role: "" }],
    }));
  }, []);

  const removeMember = useCallback((index: number) => {
    setBand((prev: any) => ({
      ...prev,
      members: prev.members.filter((_: any, i: number) => i !== index),
    }));
  }, []);

  async function handleImageUpload(index: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadImage(formData);
    setAboutImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, src: result.path } : img))
    );
  }

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
          <h2 className="text-lg font-semibold text-white">About</h2>
          <p className="text-sm text-neutral-500">
            Band info, members, bios, and photos.
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

      <Section title="Band Info">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" value={band.name} onChange={(v) => setBand({ ...band, name: v })} />
          <Field label="Tagline" value={band.tagline} onChange={(v) => setBand({ ...band, tagline: v })} />
          <Field label="Genre" value={band.genre} onChange={(v) => setBand({ ...band, genre: v })} />
          <Field label="Location" value={band.location} onChange={(v) => setBand({ ...band, location: v })} />
          <Field label="Formed" value={band.formed} onChange={(v) => setBand({ ...band, formed: v })} />
        </div>
      </Section>

      <Section title="Members">
        <div className="space-y-3">
          {band.members.map((member: BandMember, index: number) => (
            <div key={index} className="flex items-center gap-3">
              <Field
                label=""
                value={member.name}
                onChange={(v) => updateMember(index, { name: v })}
                placeholder="Name"
              />
              <Field
                label=""
                value={member.role}
                onChange={(v) => updateMember(index, { role: v })}
                placeholder="Role"
              />
              <button
                onClick={() => removeMember(index)}
                className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addMember}
            className="flex items-center gap-2 text-sm text-[#00f0ff] hover:underline"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        </div>
      </Section>

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

      <Section title="For Fans Of">
        <Field
          label=""
          value={forFansOf}
          onChange={(v) => setForFansOf(v)}
          placeholder="e.g. Blink-182, New Found Glory..."
        />
      </Section>

      <Section title="About Photos">
        <SortableList
          items={aboutImages.map((img, i) => ({ ...img, id: `img-${i}` }))}
          onChange={(items) => setAboutImages(items)}
          renderItem={(img, index) => (
            <div className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-4 space-y-3">
              <div className="flex items-center gap-3">
                {img.src ? (
                  <img src={img.src} alt="" className="w-16 h-16 rounded object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded bg-[#1e1e1e] flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-neutral-600" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(index, file);
                      }}
                    />
                    <span className="text-xs text-[#00f0ff] hover:underline">
                      {img.src ? "Replace image" : "Upload image"}
                    </span>
                  </label>
                  <Field
                    label="Alt text"
                    value={img.alt}
                    onChange={(v) =>
                      setAboutImages((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, alt: v } : item))
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
                    Span
                  </label>
                  <select
                    value={img.span || "square"}
                    onChange={(e) =>
                      setAboutImages((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? { ...item, span: e.target.value as AboutImage["span"] }
                            : item
                        )
                      )
                    }
                    className="w-full rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00f0ff]"
                  >
                    <option value="square">Square</option>
                    <option value="wide">Wide</option>
                    <option value="tall">Tall</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        />
        <button
          onClick={() =>
            setAboutImages((prev) => [...prev, { src: "", alt: "", span: "square" }])
          }
          className="flex items-center gap-2 text-sm text-[#00f0ff] hover:underline mt-3"
        >
          <Plus className="w-4 h-4" />
          Add Photo
        </button>
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
