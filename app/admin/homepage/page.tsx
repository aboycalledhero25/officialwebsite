"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Save, ImageIcon } from "lucide-react";
import { SortableList } from "@/components/admin/sortable-list";
import {
  updateSiteCopy,
  updateBannerImage,
  uploadImage,
  updateNewsItems,
  deleteNewsItem,
} from "@/lib/actions";
import { useRouter } from "next/navigation";

interface NewsItem {
  id: string;
  date: string;
  title: string;
  body: string;
}

export default function HomepageAdminPage() {
  const router = useRouter();
  const [siteCopy, setSiteCopy] = useState<any>(null);
  const [bannerImage, setBannerImage] = useState("");
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((data) => {
        setSiteCopy(data.siteCopy);
        setBannerImage(data.bannerImage || "");
        setNewsItems(data.newsItems || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (!siteCopy) return;
    setSaving(true);
    await updateSiteCopy(siteCopy);
    await updateNewsItems(newsItems);
    setSaving(false);
    router.refresh();
  }, [siteCopy, newsItems, router]);

  async function handleBannerUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadImage(formData);
    setBannerImage(result.path);
    await updateBannerImage(result.path);
    router.refresh();
  }

  const addNewsItem = useCallback(() => {
    setNewsItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toISOString().split("T")[0],
        title: "",
        body: "",
      },
    ]);
  }, []);

  const removeNewsItem = useCallback(async (id: string) => {
    if (!confirm("Delete this news item?")) return;
    await deleteNewsItem(id);
    setNewsItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  if (loading || !siteCopy) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500">
        Loading...
      </div>
    );
  }

  const home = siteCopy.home;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Homepage</h2>
          <p className="text-sm text-neutral-500">
            Edit hero, sections, and announcements.
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

      <Section title="Hero Banner">
        <div className="flex items-center gap-4 mb-4">
          {bannerImage ? (
            <img src={bannerImage} alt="" className="w-40 h-24 rounded-lg object-cover" />
          ) : (
            <div className="w-40 h-24 rounded-lg bg-[#1e1e1e] flex items-center justify-center">
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
              {bannerImage ? "Replace banner" : "Upload banner"}
            </span>
          </label>
        </div>
        <Field
          label="Announcement"
          value={home.hero.announcement}
          onChange={(v) =>
            setSiteCopy({
              ...siteCopy,
              home: { ...home, hero: { ...home.hero, announcement: v } },
            })
          }
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="CTA Listen"
            value={home.hero.ctaListen}
            onChange={(v) =>
              setSiteCopy({
                ...siteCopy,
                home: { ...home, hero: { ...home.hero, ctaListen: v } },
              })
            }
          />
          <Field
            label="CTA Merch"
            value={home.hero.ctaMerch}
            onChange={(v) =>
              setSiteCopy({
                ...siteCopy,
                home: { ...home, hero: { ...home.hero, ctaMerch: v } },
              })
            }
          />
        </div>
      </Section>

      <Section title="Latest Release Section">
        <Field
          label="Heading"
          value={home.music.heading}
          onChange={(v) =>
            setSiteCopy({ ...siteCopy, home: { ...home, music: { ...home.music, heading: v } } })
          }
        />
        <TextArea
          label="Subtitle"
          value={home.music.subtitle}
          onChange={(v) =>
            setSiteCopy({ ...siteCopy, home: { ...home, music: { ...home.music, subtitle: v } } })
          }
          rows={2}
        />
      </Section>

      <Section title="Shows Section">
        <Field
          label="Heading"
          value={home.shows.heading}
          onChange={(v) =>
            setSiteCopy({ ...siteCopy, home: { ...home, shows: { ...home.shows, heading: v } } })
          }
        />
        <TextArea
          label="Subtitle"
          value={home.shows.subtitle}
          onChange={(v) =>
            setSiteCopy({ ...siteCopy, home: { ...home, shows: { ...home.shows, subtitle: v } } })
          }
          rows={2}
        />
        <Field
          label="CTA Text"
          value={home.shows.cta}
          onChange={(v) =>
            setSiteCopy({ ...siteCopy, home: { ...home, shows: { ...home.shows, cta: v } } })
          }
        />
      </Section>

      <Section title="Merch Section">
        <Field
          label="Heading"
          value={home.merch.heading}
          onChange={(v) =>
            setSiteCopy({ ...siteCopy, home: { ...home, merch: { ...home.merch, heading: v } } })
          }
        />
        <TextArea
          label="Subtitle"
          value={home.merch.subtitle}
          onChange={(v) =>
            setSiteCopy({ ...siteCopy, home: { ...home, merch: { ...home.merch, subtitle: v } } })
          }
          rows={2}
        />
        <Field
          label="CTA Text"
          value={home.merch.cta}
          onChange={(v) =>
            setSiteCopy({ ...siteCopy, home: { ...home, merch: { ...home.merch, cta: v } } })
          }
        />
      </Section>

      <Section title="Mailing List Section">
        <Field
          label="Heading"
          value={home.mailingList.heading}
          onChange={(v) =>
            setSiteCopy({
              ...siteCopy,
              home: { ...home, mailingList: { ...home.mailingList, heading: v } },
            })
          }
        />
        <TextArea
          label="Description"
          value={home.mailingList.description}
          onChange={(v) =>
            setSiteCopy({
              ...siteCopy,
              home: { ...home, mailingList: { ...home.mailingList, description: v } },
            })
          }
          rows={2}
        />
      </Section>

      <Section title="News & Updates">
        <SortableList
          items={newsItems}
          onChange={setNewsItems}
          renderItem={(item) => (
            <div className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="Date"
                    type="date"
                    value={item.date}
                    onChange={(v) =>
                      setNewsItems((prev) =>
                        prev.map((n) => (n.id === item.id ? { ...n, date: v } : n))
                      )
                    }
                  />
                  <Field
                    label="Title"
                    value={item.title}
                    onChange={(v) =>
                      setNewsItems((prev) =>
                        prev.map((n) => (n.id === item.id ? { ...n, title: v } : n))
                      )
                    }
                  />
                </div>
                <button
                  onClick={() => removeNewsItem(item.id)}
                  className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <TextArea
                label="Body"
                value={item.body}
                onChange={(v) =>
                  setNewsItems((prev) =>
                    prev.map((n) => (n.id === item.id ? { ...n, body: v } : n))
                  )
                }
                rows={3}
              />
            </div>
          )}
        />
        <button
          onClick={addNewsItem}
          className="flex items-center gap-2 text-sm text-[#00f0ff] hover:underline mt-3"
        >
          <Plus className="w-4 h-4" />
          Add News Item
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
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
        {label}
      </label>
      <input
        type={type}
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
