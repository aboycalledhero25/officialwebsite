"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { useEditMode } from "./edit-mode-provider";

interface EditableTextProps {
  value: string;
  onSave: (value: string) => void | Promise<any>;
  multiline?: boolean;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p" | "div";
}

export function EditableText({
  value,
  onSave,
  multiline = false,
  className = "",
  as: Component = "span",
}: EditableTextProps) {
  const { isEditMode } = useEditMode();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsEditing(false);
        setDraft(value);
      }
    }
    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, value]);

  async function handleSave() {
    if (draft === value) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setIsEditing(false);
  }

  function handleCancel() {
    setIsEditing(false);
    setDraft(value);
  }

  if (!isEditMode) {
    return <Component className={className}>{value}</Component>;
  }

  if (isEditing) {
    return (
      <div ref={ref} className="relative inline-block w-full">
        <div className="rounded-lg border border-[#00f0ff] bg-[#141414] shadow-xl p-3 space-y-2">
          {multiline ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              className="w-full bg-transparent text-white text-sm outline-none resize-y"
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full bg-transparent text-white text-sm outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleCancel}
              className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-[#1e1e1e]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1.5 rounded bg-[#00f0ff]/10 text-[#00f0ff] hover:bg-[#00f0ff]/20"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Component
      className={`relative group cursor-pointer ${className}`}
      onClick={() => setIsEditing(true)}
    >
      <span className="border-b border-dashed border-transparent group-hover:border-[#00f0ff]/50 transition-colors">
        {value}
      </span>
      <Pencil className="inline-block w-3 h-3 ml-1 text-[#00f0ff] opacity-0 group-hover:opacity-100 transition-opacity" />
    </Component>
  );
}
