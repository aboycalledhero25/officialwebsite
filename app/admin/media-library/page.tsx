"use client";

import { useState, useEffect, useCallback } from "react";
import { Upload, Trash2, Copy, ImageIcon, Search } from "lucide-react";
import { listImages, uploadImage, deleteImage } from "@/lib/actions";
import { useRouter } from "next/navigation";

interface MediaFile {
  name: string;
  path: string;
  size: number;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function MediaLibraryPage() {
  const router = useRouter();
  const [images, setImages] = useState<MediaFile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadImages = useCallback(async () => {
    setLoading(true);
    const result = await listImages();
    setImages(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  async function handleUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    await uploadImage(formData);
    await loadImages();
    setUploading(false);
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    await deleteImage(name);
    await loadImages();
  }

  async function copyUrl(path: string) {
    await navigator.clipboard.writeText(path);
  }

  const filtered = images.filter((img) =>
    img.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Media Library</h2>
          <p className="text-sm text-neutral-500">
            {images.length} image{images.length !== 1 ? "s" : ""} uploaded
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-lg border border-[#1e1e1e] bg-[#141414] text-sm text-white outline-none focus:border-[#00f0ff]"
            />
          </div>
          <label className="cursor-pointer flex items-center gap-2 rounded-lg bg-[#00f0ff] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity">
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading..." : "Upload"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-neutral-500">
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#1e1e1e] rounded-xl">
          <ImageIcon className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">
            {search ? "No images match your search." : "No images uploaded yet."}
          </p>
          {!search && (
            <label className="mt-3 inline-block text-sm text-[#00f0ff] hover:underline cursor-pointer">
              Upload your first image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
            </label>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((img) => (
            <div
              key={img.name}
              className="group rounded-xl border border-[#1e1e1e] bg-[#141414] overflow-hidden"
            >
              <div className="aspect-square relative bg-[#0a0a0a]">
                <img
                  src={img.path}
                  alt={img.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => copyUrl(img.path)}
                    className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                    title="Copy URL"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(img.name)}
                    className="p-2 rounded-lg bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs text-neutral-400 truncate" title={img.name}>
                  {img.name}
                </p>
                <p className="text-[10px] text-neutral-600 mt-0.5">{formatSize(img.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
