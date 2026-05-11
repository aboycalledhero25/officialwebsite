"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

interface SiteCopyEditorProps {
  value: any;
  onChange: (v: any) => void;
  path?: string;
}

function isLongText(key: string, val: string): boolean {
  return val.length > 60 || key.includes("Description") || key.includes("Body") || key.includes("Message") || key.includes("Subtitle") || key.includes("Bio") || key.includes("Placeholder");
}

export function SiteCopyEditor({ value, onChange, path = "" }: SiteCopyEditorProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (typeof value === "string") {
    const isLong = isLongText(path, value);
    return isLong ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
      />
    );
  }

  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return (
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...value];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={() => {
                const next = value.filter((_, idx) => idx !== i);
                onChange(next);
              }}
              className="rounded-md p-1.5 text-muted hover:bg-red-500/10 hover:text-red-400"
              title="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...value, ""])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <Plus size={12} />
          Add item
        </button>
      </div>
    );
  }

  if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value);
    return (
      <div className="space-y-1">
        {keys.map((key) => {
          const childPath = path ? `${path}.${key}` : key;
          const isOpen = expanded[childPath] ?? true;
          const child = value[key];
          const isPrimitive = typeof child !== "object" || child === null || (Array.isArray(child) && child.every((v) => typeof v === "string"));

          return (
            <div key={key} className="rounded-lg border border-border/50 bg-background/50">
              <button
                onClick={() => setExpanded((prev) => ({ ...prev, [childPath]: !isOpen }))}
                className="flex w-full items-center gap-2 px-3 py-2 text-left"
              >
                {isPrimitive ? (
                  <span className="h-4 w-4 shrink-0" />
                ) : isOpen ? (
                  <ChevronDown size={16} className="shrink-0 text-muted" />
                ) : (
                  <ChevronRight size={16} className="shrink-0 text-muted" />
                )}
                <span className="text-xs font-bold uppercase tracking-widest text-muted">
                  {key}
                </span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 pt-0">
                  <SiteCopyEditor
                    value={child}
                    onChange={(next) => onChange({ ...value, [key]: next })}
                    path={childPath}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return <span className="text-xs text-muted">Unsupported value type</span>;
}
