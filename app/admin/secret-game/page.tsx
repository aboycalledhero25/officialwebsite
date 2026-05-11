"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Gamepad2, RotateCcw, Play, Eye, EyeOff, MousePointer2 } from "lucide-react";
import { HotspotLiveEditor } from "@/components/secret-game/hotspot-live-editor";
import { updateSecretGameSettings } from "@/lib/actions";
import { useRouter } from "next/navigation";

export default function SecretGameAdminPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.secretGame || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    try {
      const hs = localStorage.getItem("abch-guitar-invaders-highscore");
      if (hs) setHighScore(parseInt(hs, 10));
    } catch {}
  }, []);

  const handleSave = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    await updateSecretGameSettings(settings);
    setSaving(false);
    router.refresh();
  }, [settings, router]);

  const handleResetHighScore = useCallback(() => {
    try {
      localStorage.removeItem("abch-guitar-invaders-highscore");
      setHighScore(0);
    } catch {}
  }, []);

  const updateField = useCallback((path: string, value: any) => {
    setSettings((prev: any) => {
      if (!prev) return prev;
      const keys = path.split(".");
      const next = { ...prev };
      let target: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        target[keys[i]] = { ...target[keys[i]] };
        target = target[keys[i]];
      }
      target[keys[keys.length - 1]] = value;
      return next;
    });
  }, []);

  const handlePreview = useCallback(() => {
    window.open("/secret-game", "_blank");
  }, []);

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500">
        Loading...
      </div>
    );
  }

  const hs = settings.hotspot;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-[#ff006e]" />
            Secret Game
          </h2>
          <p className="text-sm text-neutral-500">
            Configure the hidden Guitar Invaders mini game and homepage hotspot.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 rounded-lg border border-[#1e1e1e] bg-[#141414] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a1a1a] transition-colors"
          >
            <Play className="w-4 h-4" />
            Preview
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

      {/* Enable toggles */}
      <Section title="Game Status">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Toggle
            label="Enable Secret Game"
            checked={settings.enabled}
            onChange={(v) => updateField("enabled", v)}
          />
          <Toggle
            label="Enable Homepage Hotspot"
            checked={hs.enabled}
            onChange={(v) => updateField("hotspot.enabled", v)}
          />
        </div>
      </Section>

      {/* Live visual editor */}
      <Section title="Hotspot Visual Editor">
        <div className="flex items-center gap-2 mb-3">
          <MousePointer2 className="w-4 h-4 text-[#ff006e]" />
          <p className="text-sm text-neutral-300">
            Drag the pink box to move. Drag the handles to resize. Save when done.
          </p>
        </div>
        <HotspotLiveEditor
          settings={settings}
          onSave={(next) => {
            setSettings(next);
          }}
        />
      </Section>

      {/* Hotspot position — numeric fallback */}
      <Section title="Hotspot Position & Size (Numeric)">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <NumberField
            label={`X (${hs.unit})`}
            value={hs.x}
            onChange={(v) => updateField("hotspot.x", v)}
            min={0}
            max={hs.unit === "%" ? 100 : 2000}
            step={hs.unit === "%" ? 0.1 : 1}
          />
          <NumberField
            label={`Y (${hs.unit})`}
            value={hs.y}
            onChange={(v) => updateField("hotspot.y", v)}
            min={0}
            max={hs.unit === "%" ? 100 : 2000}
            step={hs.unit === "%" ? 0.1 : 1}
          />
          <NumberField
            label={`Width (${hs.unit})`}
            value={hs.width}
            onChange={(v) => updateField("hotspot.width", v)}
            min={hs.unit === "%" ? 1 : 10}
            max={hs.unit === "%" ? 100 : 2000}
            step={hs.unit === "%" ? 0.1 : 1}
          />
          <NumberField
            label={`Height (${hs.unit})`}
            value={hs.height}
            onChange={(v) => updateField("hotspot.height", v)}
            min={hs.unit === "%" ? 1 : 10}
            max={hs.unit === "%" ? 100 : 2000}
            step={hs.unit === "%" ? 0.1 : 1}
          />
        </div>

        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
            <input
              type="checkbox"
              checked={hs.visibleToVisitors}
              onChange={(e) => updateField("hotspot.visibleToVisitors", e.target.checked)}
              className="accent-[#ff006e]"
            />
            {hs.visibleToVisitors ? (
              <Eye className="w-4 h-4 text-[#00f0ff]" />
            ) : (
              <EyeOff className="w-4 h-4 text-neutral-500" />
            )}
            Visible to visitors
          </label>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Hover Style"
            value={hs.hoverStyle}
            onChange={(v) => updateField("hotspot.hoverStyle", v)}
            placeholder="hidden | subtle | outline"
          />
          <Field
            label="Tooltip"
            value={hs.tooltip}
            onChange={(v) => updateField("hotspot.tooltip", v)}
            placeholder="e.g. ???"
          />
          <NumberField
            label="Z-Index"
            value={hs.zIndex}
            onChange={(v) => updateField("hotspot.zIndex", v)}
            min={0}
            max={9999}
            step={1}
          />
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
              Unit
            </label>
            <select
              value={hs.unit}
              onChange={(e) => updateField("hotspot.unit", e.target.value)}
              className="w-full rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
            >
              <option value="%">Percent (%)</option>
              <option value="px">Pixels (px)</option>
            </select>
          </div>
        </div>
      </Section>

      {/* Player Sprite */}
      <Section title="Player Sprite">
        <p className="text-sm text-neutral-500">
          Adjust the position and size of the player guitar sprite.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <NumberField
            label="Offset X"
            value={settings.playerSprite?.offsetX ?? -2}
            onChange={(v) => updateField("playerSprite.offsetX", v)}
            step={1}
          />
          <NumberField
            label="Offset Y"
            value={settings.playerSprite?.offsetY ?? -12}
            onChange={(v) => updateField("playerSprite.offsetY", v)}
            step={1}
          />
          <NumberField
            label="Width"
            value={settings.playerSprite?.width ?? 14}
            onChange={(v) => updateField("playerSprite.width", v)}
            min={1}
            max={100}
            step={1}
          />
          <NumberField
            label="Height"
            value={settings.playerSprite?.height ?? 42}
            onChange={(v) => updateField("playerSprite.height", v)}
            min={1}
            max={100}
            step={1}
          />
        </div>
      </Section>

      {/* Game copy */}
      <Section title="Game Copy">
        <div className="space-y-4">
          <Field
            label="Game Title"
            value={settings.title}
            onChange={(v) => updateField("title", v)}
          />
          <TextArea
            label="Instructions"
            value={settings.instructions}
            onChange={(v) => updateField("instructions", v)}
            rows={2}
          />
        </div>
      </Section>

      {/* High scores */}
      <Section title="High Scores">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-300">
              Current local high score: <span className="text-[#fcee0a] font-mono font-bold">{highScore}</span>
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Stored in visitors&apos; browsers via localStorage.
            </p>
          </div>
          <button
            onClick={handleResetHighScore}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Local Scores
          </button>
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

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
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
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-[#00f0ff]" : "bg-neutral-700"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </div>
      <span className="text-sm text-neutral-300">{label}</span>
    </label>
  );
}
