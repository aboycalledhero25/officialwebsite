"use client";

import { useState, useCallback } from "react";
import { Pencil, Trash2, Upload, X } from "lucide-react";
import { useEditMode } from "./edit-mode-provider";
import { uploadImage } from "@/lib/actions";

interface EditableImageProps {
  src: string;
  alt?: string;
  onChange: (src: string) => void | Promise<any>;
  onDelete?: () => void | Promise<void>;
  className?: string;
  imgClassName?: string;
}

export function EditableImage({
  src,
  alt = "",
  onChange,
  onDelete,
  className = "",
  imgClassName = "",
}: EditableImageProps) {
  const { isEditMode } = useEditMode();
  const [hovering, setHovering] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadImage(formData);
      await onChange(result.path);
      setUploading(false);
      setHovering(false);
    },
    [onChange]
  );

  if (!isEditMode) {
    return (
      <div className={className}>
        <img src={src} alt={alt} className={imgClassName} />
      </div>
    );
  }

  return (
    <div
      className={`relative group ${className}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <img src={src} alt={alt} className={imgClassName} />

      {(hovering || uploading) && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 rounded-lg">
          {uploading ? (
            <span className="text-xs text-white">Uploading...</span>
          ) : (
            <>
              <label className="cursor-pointer flex items-center gap-2 rounded-lg bg-[#00f0ff] px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 transition-opacity">
                <Upload className="w-3.5 h-3.5" />
                Replace
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
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      )}

      {!hovering && (
        <div className="absolute top-2 right-2 p-1.5 rounded bg-black/50 text-[#00f0ff] opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
}
