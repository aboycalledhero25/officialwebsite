"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Save, Video, Check } from "lucide-react";
import { SortableList } from "@/components/admin/sortable-list";
import { updateVideos, deleteVideo } from "@/lib/actions";
import { extractYouTubeId } from "@/lib/youtube";
import { useRouter } from "next/navigation";

interface Video {
  id: string;
  title: string;
  youtubeId: string;
  type: "music-video" | "live" | "behind-the-scenes";
  description: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function EmptyVideo(): Video {
  return {
    id: generateId(),
    title: "",
    youtubeId: "",
    type: "music-video",
    description: "",
  };
}

export default function MediaAdminPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((data) => {
        setVideos(data.videos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await updateVideos(videos);
    setSaving(false);
    router.refresh();
  }, [videos, router]);

  const handleAdd = useCallback(() => {
    setVideos((prev) => [...prev, EmptyVideo()]);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this video?")) return;
    await deleteVideo(id);
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const updateVideo = useCallback((id: string, updates: Partial<Video>) => {
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  }, []);

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
          <h2 className="text-lg font-semibold text-white">Videos</h2>
          <p className="text-sm text-neutral-500">
            Add, edit, and reorder YouTube videos.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-lg bg-[#1e1e1e] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Video
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

      {videos.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#1e1e1e] rounded-xl">
          <Video className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">No videos yet.</p>
          <button
            onClick={handleAdd}
            className="mt-3 text-sm text-[#00f0ff] hover:underline"
          >
            Add your first video
          </button>
        </div>
      ) : (
        <SortableList
          items={videos}
          onChange={setVideos}
          renderItem={(video) => (
            <div className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Title"
                    value={video.title}
                    onChange={(v) => updateVideo(video.id, { title: v })}
                  />
                  <YouTubeUrlField
                    label="YouTube URL"
                    value={video.youtubeId}
                    onChange={(v) => updateVideo(video.id, { youtubeId: v })}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
                      Type
                    </label>
                    <select
                      value={video.type}
                      onChange={(e) =>
                        updateVideo(video.id, {
                          type: e.target.value as Video["type"],
                        })
                      }
                      className="w-full rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
                    >
                      <option value="music-video">Music Video</option>
                      <option value="live">Live</option>
                      <option value="behind-the-scenes">Behind the Scenes</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(video.id)}
                  className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <TextArea
                label="Description"
                value={video.description}
                onChange={(v) => updateVideo(video.id, { description: v })}
                rows={2}
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

function YouTubeUrlField({
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
  const [raw, setRaw] = useState(value);
  const extracted = extractYouTubeId(raw);

  useEffect(() => {
    setRaw(value);
  }, [value]);

  function handleChange(newValue: string) {
    setRaw(newValue);
    const id = extractYouTubeId(newValue);
    if (id) {
      onChange(id);
    } else {
      // Allow raw value while typing; only store ID when valid
      onChange(newValue);
    }
  }

  function handleBlur() {
    const id = extractYouTubeId(raw);
    if (id) {
      setRaw(id);
      onChange(id);
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
      />
      {extracted && extracted !== raw && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="text-xs text-emerald-400">
            Extracted ID: {extracted}
          </span>
        </div>
      )}
    </div>
  );
}
