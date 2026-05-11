"use client";

import { useState } from "react";
import { SecretGameSettings } from "@/lib/data";
import { updateSecretGameSettings } from "@/lib/actions";

interface HotspotEditPanelProps {
  settings: SecretGameSettings;
  onUpdate: (s: SecretGameSettings) => void;
}

export function HotspotEditPanel({ settings, onUpdate }: HotspotEditPanelProps) {
  const hs = settings.hotspot;
  const [draft, setDraft] = useState({ ...hs });
  const [saving, setSaving] = useState(false);

  const handleChange = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const next: SecretGameSettings = {
      ...settings,
      hotspot: { ...draft },
    };
    try {
      await updateSecretGameSettings(next);
      onUpdate(next);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(hs);

  return (
    <div className="absolute top-full left-0 mt-6 w-64 rounded-xl bg-[#141414] border border-[#1e1e1e] p-3 shadow-2xl z-50">
      <h4 className="text-xs font-bold text-white mb-2">Hotspot Settings</h4>

      <div className="space-y-2">
        <label className="flex items-center justify-between text-xs text-neutral-300">
          <span>Enabled</span>
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => handleChange("enabled", e.target.checked)}
            className="accent-[#ff006e]"
          />
        </label>

        <label className="flex items-center justify-between text-xs text-neutral-300">
          <span>Visible to visitors</span>
          <input
            type="checkbox"
            checked={draft.visibleToVisitors}
            onChange={(e) => handleChange("visibleToVisitors", e.target.checked)}
            className="accent-[#ff006e]"
          />
        </label>

        <label className="flex items-center justify-between text-xs text-neutral-300">
          <span>Hover style</span>
          <select
            value={draft.hoverStyle}
            onChange={(e) => handleChange("hoverStyle", e.target.value as any)}
            className="bg-[#0a0a0a] border border-[#1e1e1e] rounded px-1 py-0.5 text-xs text-white"
          >
            <option value="hidden">Hidden</option>
            <option value="subtle">Subtle</option>
            <option value="outline">Outline</option>
          </select>
        </label>

        <div>
          <label className="block text-[10px] text-neutral-500 mb-0.5">Tooltip</label>
          <input
            type="text"
            value={draft.tooltip}
            onChange={(e) => handleChange("tooltip", e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded px-2 py-1 text-xs text-white"
            placeholder="e.g. ???"
          />
        </div>

        <div>
          <label className="block text-[10px] text-neutral-500 mb-0.5">Z-Index</label>
          <input
            type="number"
            value={draft.zIndex}
            onChange={(e) => handleChange("zIndex", parseInt(e.target.value) || 0)}
            className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded px-2 py-1 text-xs text-white"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={`flex-1 rounded py-1.5 text-[10px] font-bold transition-colors ${
              isDirty
                ? "bg-[#00f0ff] text-black hover:brightness-110"
                : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
            }`}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
