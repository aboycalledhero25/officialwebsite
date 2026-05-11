"use client";

import { useState, useCallback, useEffect } from "react";
import { Save, Settings, ImageIcon, Eye, EyeOff } from "lucide-react";
import { updateSiteMeta, updateSiteCopy, updatePageVisibility, uploadImage, updateBannerImage } from "@/lib/actions";
import { useRouter } from "next/navigation";

const PAGE_LABELS: Record<string, string> = {
  home: "Home",
  music: "Music",
  merch: "Merch",
  shows: "Shows",
  about: "About",
  media: "Media",
  press: "Press",
  contact: "Contact",
  live: "Live",
};

export default function SettingsAdminPage() {
  const router = useRouter();
  const [siteMeta, setSiteMeta] = useState<any>(null);
  const [siteCopy, setSiteCopy] = useState<any>(null);
  const [pageVisibility, setPageVisibility] = useState<Record<string, boolean> | null>(null);
  const [bannerImage, setBannerImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((data) => {
        setSiteMeta(data.siteMeta);
        setSiteCopy(data.siteCopy);
        setPageVisibility(data.pageVisibility || {});
        setBannerImage(data.bannerImage || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (!siteMeta || !siteCopy) return;
    setSaving(true);
    try {
      await updateSiteMeta(siteMeta);
      await updateSiteCopy(siteCopy);
      if (pageVisibility) {
        await updatePageVisibility(pageVisibility);
      }
      router.refresh();
    } catch (err) {
      console.error("Save failed:", err);
      alert("Save failed. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }, [siteMeta, siteCopy, pageVisibility, router]);

  async function handleBannerUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadImage(formData);
    setBannerImage(result.path);
    await updateBannerImage(result.path);
    router.refresh();
  }

  if (loading || !siteMeta || !siteCopy) {
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
          <h2 className="text-lg font-semibold text-white">Site Settings</h2>
          <p className="text-sm text-neutral-500">
            SEO, navigation, footer, page visibility, and branding.
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

      <Section title="SEO / Meta">
        <div className="space-y-4">
          <Field
            label="Site Title"
            value={siteMeta.title}
            onChange={(v) => setSiteMeta({ ...siteMeta, title: v })}
          />
          <TextArea
            label="Site Description"
            value={siteMeta.description}
            onChange={(v) => setSiteMeta({ ...siteMeta, description: v })}
            rows={2}
          />
          <Field
            label="Site URL"
            value={siteMeta.url}
            onChange={(v) => setSiteMeta({ ...siteMeta, url: v })}
          />
          <Field
            label="Twitter Handle"
            value={siteMeta.twitterHandle}
            onChange={(v) => setSiteMeta({ ...siteMeta, twitterHandle: v })}
          />
          <Field
            label="OG Image"
            value={siteMeta.image}
            onChange={(v) => setSiteMeta({ ...siteMeta, image: v })}
          />
        </div>
      </Section>

      <Section title="Homepage Banner">
        <div className="flex items-center gap-4">
          {bannerImage ? (
            <img src={bannerImage} alt="" className="w-32 h-20 rounded-lg object-cover" />
          ) : (
            <div className="w-32 h-20 rounded-lg bg-[#1e1e1e] flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-neutral-600" />
            </div>
          )}
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleBannerUpload(file);
              }}
            />
            <span className="text-sm text-[#00f0ff] hover:underline">
              {bannerImage ? "Replace banner image" : "Upload banner image"}
            </span>
          </label>
        </div>
      </Section>

      <Section title="Page Visibility">
        <p className="text-sm text-neutral-500">
          Toggle pages off to hide them from the navigation, footer, and block direct access. The admin pages are always visible to logged-in admins.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pageVisibility &&
            Object.entries(PAGE_LABELS).map(([key, label]) => (
              <Toggle
                key={key}
                label={label}
                enabled={pageVisibility[key] ?? true}
                onChange={(enabled) =>
                  setPageVisibility({ ...pageVisibility, [key]: enabled })
                }
              />
            ))}
        </div>
      </Section>

      <Section title="Navigation Labels">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Object.entries(siteCopy.nav).map(([key, value]) => (
            <Field
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              value={value as string}
              onChange={(v) =>
                setSiteCopy({
                  ...siteCopy,
                  nav: { ...siteCopy.nav, [key]: v },
                })
              }
            />
          ))}
        </div>
      </Section>

      <Section title="Footer">
        <div className="space-y-4">
          <TextArea
            label="Tagline"
            value={siteCopy.footer.tagline}
            onChange={(v) =>
              setSiteCopy({
                ...siteCopy,
                footer: { ...siteCopy.footer, tagline: v },
              })
            }
            rows={2}
          />
          <Field
            label="Copyright Suffix"
            value={siteCopy.footer.copyrightSuffix}
            onChange={(v) =>
              setSiteCopy({
                ...siteCopy,
                footer: { ...siteCopy.footer, copyrightSuffix: v },
              })
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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

function Toggle({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`flex items-center justify-between w-full rounded-lg border px-4 py-3 text-sm transition-colors ${
        enabled
          ? "border-[#00f0ff]/30 bg-[#00f0ff]/5 text-white"
          : "border-[#1e1e1e] bg-[#0a0a0a] text-neutral-500"
      }`}
    >
      <span className="flex items-center gap-2">
        {enabled ? (
          <Eye className="w-4 h-4 text-[#00f0ff]" />
        ) : (
          <EyeOff className="w-4 h-4 text-neutral-600" />
        )}
        {label}
      </span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          enabled ? "bg-[#00f0ff]" : "bg-neutral-700"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-4.5" : "translate-x-1"
          }`}
          style={{ transform: enabled ? "translateX(18px)" : "translateX(2px)" }}
        />
      </span>
    </button>
  );
}
