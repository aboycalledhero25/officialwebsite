"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Save, Music, ImageIcon } from "lucide-react";
import { SortableList } from "@/components/admin/sortable-list";
import {
  updateReleases,
  addRelease,
  deleteRelease,
  uploadImage,
} from "@/lib/actions";
import { useRouter } from "next/navigation";

interface Release {
  id: string;
  title: string;
  type: string;
  releaseDate: string;
  artwork: string;
  description: string;
  spotifyUrl: string;
  appleMusicUrl: string;
  youtubeUrl: string;
  bandcampUrl: string;
  embedUrl: string;
  lyrics: string;
  meaning: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function EmptyRelease(): Release {
  return {
    id: generateId(),
    title: "",
    type: "Single",
    releaseDate: new Date().toISOString().split("T")[0],
    artwork: "",
    description: "",
    spotifyUrl: "",
    appleMusicUrl: "",
    youtubeUrl: "",
    bandcampUrl: "",
    embedUrl: "",
    lyrics: "",
    meaning: "",
  };
}

export default function MusicAdminPage() {
  const router = useRouter();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((data) => {
        setReleases(data.releases || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await updateReleases(releases);
    setSaving(false);
    router.refresh();
  }, [releases, router]);

  const handleAdd = useCallback(() => {
    setReleases((prev) => [...prev, EmptyRelease()]);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this release?")) return;
    await deleteRelease(id);
    setReleases((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateRelease = useCallback((id: string, updates: Partial<Release>) => {
    setReleases((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  async function handleImageUpload(id: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadImage(formData);
    updateRelease(id, { artwork: result.path });
  }

  if (loading) {
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
          <h2 className="text-lg font-semibold text-white">Releases</h2>
          <p className="text-sm text-neutral-500">
            Add, edit, and reorder your music releases.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-lg bg-[#1e1e1e] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Release
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#00f0ff] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {releases.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#1e1e1e] rounded-xl">
          <Music className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">No releases yet.</p>
          <button
            onClick={handleAdd}
            className="mt-3 text-sm text-[#00f0ff] hover:underline"
          >
            Add your first release
          </button>
        </div>
      ) : (
        <SortableList
          items={releases}
          onChange={setReleases}
          renderItem={(release) => (
            <div className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Title"
                    value={release.title}
                    onChange={(v) => updateRelease(release.id, { title: v })}
                  />
                  <Field
                    label="Type"
                    value={release.type}
                    onChange={(v) => updateRelease(release.id, { type: v })}
                  />
                  <Field
                    label="Release Date"
                    type="date"
                    value={release.releaseDate}
                    onChange={(v) => updateRelease(release.id, { releaseDate: v })}
                  />
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
                      Artwork
                    </label>
                    <div className="flex items-center gap-2">
                      {release.artwork ? (
                        <img
                          src={release.artwork}
                          alt=""
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-[#1e1e1e] flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-neutral-600" />
                        </div>
                      )}
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(release.id, file);
                          }}
                        />
                        <span className="block text-xs text-[#00f0ff] hover:underline truncate">
                          {release.artwork ? "Replace image" : "Upload artwork"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(release.id)}
                  className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <TextArea
                label="Description"
                value={release.description}
                onChange={(v) => updateRelease(release.id, { description: v })}
                rows={2}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Spotify URL"
                  value={release.spotifyUrl}
                  onChange={(v) => updateRelease(release.id, { spotifyUrl: v })}
                />
                <Field
                  label="Apple Music URL"
                  value={release.appleMusicUrl}
                  onChange={(v) => updateRelease(release.id, { appleMusicUrl: v })}
                />
                <Field
                  label="YouTube URL"
                  value={release.youtubeUrl}
                  onChange={(v) => updateRelease(release.id, { youtubeUrl: v })}
                />
                <Field
                  label="Bandcamp URL"
                  value={release.bandcampUrl}
                  onChange={(v) => updateRelease(release.id, { bandcampUrl: v })}
                />
              </div>

              <TextArea
                label="Embed Code (Spotify / Apple Music)"
                value={release.embedUrl}
                onChange={(v) => updateRelease(release.id, { embedUrl: v })}
                rows={2}
              />

              <TextArea
                label="Lyrics"
                value={release.lyrics}
                onChange={(v) => updateRelease(release.id, { lyrics: v })}
                rows={4}
              />

              <TextArea
                label="Song Meaning"
                value={release.meaning}
                onChange={(v) => updateRelease(release.id, { meaning: v })}
                rows={3}
              />
            </div>
          )}
        />
      )}
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
