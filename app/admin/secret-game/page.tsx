"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Gamepad2, RotateCcw, Play, Smartphone, Monitor } from "lucide-react";
import { GameEditorPreview } from "@/components/secret-game/game-editor-preview";
import { updateSecretGameSettings } from "@/lib/actions";
import { useRouter } from "next/navigation";
import type { SecretGameSettings, GamePlatformSettings } from "@/lib/data";

const DEFAULT_PLATFORM: GamePlatformSettings = {
  player: { x: 115, y: 265 },
  hearts: { visible: true, x: 190, y: 8, size: 28 },
  arrowKeys: { visible: false, x: 8, y: 280, size: 40 },
  touchArea: { visible: false, x: 0, y: 200, width: 240, height: 120 },
  fireButton: { visible: true, x: 200, y: 270, size: 44 },
  enemy: {
    speed: 18,
    fireRate: 0.003,
    projectileSpeed: 60,
    columns: 5,
    rows: 3,
    startY: 30,
    paddingX: 6,
    paddingY: 8,
    dropDistance: 6,
  },
};

export default function SecretGameAdminPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SecretGameSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [platform, setPlatform] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((data) => {
        const sg = data.secretGame || {};
        // Ensure new fields exist with defaults
        const merged: SecretGameSettings = {
          enabled: sg.enabled ?? true,
          title: sg.title ?? "HERO INVADERS",
          instructions: sg.instructions ?? "Defend the stage from the invasion!",
          playerSprite: sg.playerSprite ?? { offsetX: -2, offsetY: -12, width: 14, height: 42 },
          desktop: { ...DEFAULT_PLATFORM, ...sg.desktop },
          mobile: { ...DEFAULT_PLATFORM, ...sg.mobile },
        };
        setSettings(merged);
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
    setSettings((prev) => {
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

  const updatePlatform = useCallback(
    (nextPlatform: GamePlatformSettings) => {
      setSettings((prev) => {
        if (!prev) return prev;
        return { ...prev, [platform]: nextPlatform };
      });
    },
    [platform]
  );

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

  const plat = settings[platform];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-[#ff006e]" />
            Secret Game Editor
          </h2>
          <p className="text-sm text-neutral-500">
            Visually edit the game layout for desktop and mobile.
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

      {/* Enable toggle */}
      <div className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-5">
        <Toggle
          label="Enable Secret Game"
          checked={settings.enabled}
          onChange={(v) => updateField("enabled", v)}
        />
      </div>

      {/* Platform toggle + Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Settings forms */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Platform tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setPlatform("desktop")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                platform === "desktop"
                  ? "bg-[#00f0ff] text-black"
                  : "bg-[#1e1e1e] text-neutral-300 hover:bg-[#2a2a2a]"
              }`}
            >
              <Monitor className="w-4 h-4" />
              Desktop
            </button>
            <button
              onClick={() => setPlatform("mobile")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                platform === "mobile"
                  ? "bg-[#00f0ff] text-black"
                  : "bg-[#1e1e1e] text-neutral-300 hover:bg-[#2a2a2a]"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Mobile
            </button>
          </div>

          {/* Enemy Logic */}
          <Section title="Enemy Logic">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <NumberField label="Speed" value={plat.enemy.speed} onChange={(v) => updateField(`${platform}.enemy.speed`, v)} min={0} max={200} step={1} />
              <NumberField label="Fire Rate" value={plat.enemy.fireRate} onChange={(v) => updateField(`${platform}.enemy.fireRate`, v)} min={0} max={1} step={0.001} />
              <NumberField label="Projectile Speed" value={plat.enemy.projectileSpeed} onChange={(v) => updateField(`${platform}.enemy.projectileSpeed`, v)} min={0} max={300} step={1} />
              <NumberField label="Columns" value={plat.enemy.columns} onChange={(v) => updateField(`${platform}.enemy.columns`, v)} min={1} max={12} step={1} />
              <NumberField label="Rows" value={plat.enemy.rows} onChange={(v) => updateField(`${platform}.enemy.rows`, v)} min={1} max={8} step={1} />
              <NumberField label="Start Y" value={plat.enemy.startY} onChange={(v) => updateField(`${platform}.enemy.startY`, v)} min={0} max={300} step={1} />
              <NumberField label="Padding X" value={plat.enemy.paddingX} onChange={(v) => updateField(`${platform}.enemy.paddingX`, v)} min={0} max={50} step={1} />
              <NumberField label="Padding Y" value={plat.enemy.paddingY} onChange={(v) => updateField(`${platform}.enemy.paddingY`, v)} min={0} max={50} step={1} />
              <NumberField label="Drop Distance" value={plat.enemy.dropDistance} onChange={(v) => updateField(`${platform}.enemy.dropDistance`, v)} min={0} max={50} step={1} />
            </div>
          </Section>

          {/* Player Position */}
          <Section title="Player Position">
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="X" value={plat.player.x} onChange={(v) => updateField(`${platform}.player.x`, v)} min={0} max={240} step={1} />
              <NumberField label="Y" value={plat.player.y} onChange={(v) => updateField(`${platform}.player.y`, v)} min={0} max={320} step={1} />
            </div>
            <p className="text-xs text-neutral-500 mt-2">Tip: Drag the player in the preview to move it.</p>
          </Section>

          {/* Hearts */}
          <Section title="Lives (Hearts)">
            <div className="flex items-center gap-4 mb-3">
              <Toggle label="Visible" checked={plat.hearts.visible} onChange={(v) => updateField(`${platform}.hearts.visible`, v)} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <NumberField label="X" value={plat.hearts.x} onChange={(v) => updateField(`${platform}.hearts.x`, v)} min={0} max={240} step={1} />
              <NumberField label="Y" value={plat.hearts.y} onChange={(v) => updateField(`${platform}.hearts.y`, v)} min={0} max={320} step={1} />
              <NumberField label="Size" value={plat.hearts.size} onChange={(v) => updateField(`${platform}.hearts.size`, v)} min={8} max={64} step={1} />
            </div>
          </Section>

          {/* Arrow Keys */}
          <Section title="Arrow Keys (Desktop On-Screen)">
            <div className="flex items-center gap-4 mb-3">
              <Toggle label="Visible" checked={plat.arrowKeys.visible} onChange={(v) => updateField(`${platform}.arrowKeys.visible`, v)} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <NumberField label="X" value={plat.arrowKeys.x} onChange={(v) => updateField(`${platform}.arrowKeys.x`, v)} min={0} max={240} step={1} />
              <NumberField label="Y" value={plat.arrowKeys.y} onChange={(v) => updateField(`${platform}.arrowKeys.y`, v)} min={0} max={320} step={1} />
              <NumberField label="Size" value={plat.arrowKeys.size} onChange={(v) => updateField(`${platform}.arrowKeys.size`, v)} min={20} max={80} step={1} />
            </div>
          </Section>

          {/* Touch Area */}
          <Section title="Touch Area (Mobile Swipe)">
            <div className="flex items-center gap-4 mb-3">
              <Toggle label="Visible" checked={plat.touchArea.visible} onChange={(v) => updateField(`${platform}.touchArea.visible`, v)} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <NumberField label="X" value={plat.touchArea.x} onChange={(v) => updateField(`${platform}.touchArea.x`, v)} min={0} max={240} step={1} />
              <NumberField label="Y" value={plat.touchArea.y} onChange={(v) => updateField(`${platform}.touchArea.y`, v)} min={0} max={320} step={1} />
              <NumberField label="Width" value={plat.touchArea.width} onChange={(v) => updateField(`${platform}.touchArea.width`, v)} min={0} max={240} step={1} />
              <NumberField label="Height" value={plat.touchArea.height} onChange={(v) => updateField(`${platform}.touchArea.height`, v)} min={0} max={320} step={1} />
            </div>
          </Section>

          {/* Fire Button */}
          <Section title="Fire Button">
            <div className="flex items-center gap-4 mb-3">
              <Toggle label="Visible" checked={plat.fireButton.visible} onChange={(v) => updateField(`${platform}.fireButton.visible`, v)} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <NumberField label="X" value={plat.fireButton.x} onChange={(v) => updateField(`${platform}.fireButton.x`, v)} min={0} max={240} step={1} />
              <NumberField label="Y" value={plat.fireButton.y} onChange={(v) => updateField(`${platform}.fireButton.y`, v)} min={0} max={320} step={1} />
              <NumberField label="Size" value={plat.fireButton.size} onChange={(v) => updateField(`${platform}.fireButton.size`, v)} min={20} max={80} step={1} />
            </div>
          </Section>

          {/* Game Copy */}
          <Section title="Game Copy">
            <div className="space-y-4">
              <Field label="Title" value={settings.title} onChange={(v) => updateField("title", v)} />
              <TextArea label="Instructions" value={settings.instructions} onChange={(v) => updateField("instructions", v)} rows={2} />
            </div>
          </Section>

          {/* Player Sprite */}
          <Section title="Player Sprite Offset">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Offset X" value={settings.playerSprite.offsetX} onChange={(v) => updateField("playerSprite.offsetX", v)} step={1} />
              <NumberField label="Offset Y" value={settings.playerSprite.offsetY} onChange={(v) => updateField("playerSprite.offsetY", v)} step={1} />
              <NumberField label="Width" value={settings.playerSprite.width} onChange={(v) => updateField("playerSprite.width", v)} min={1} max={100} step={1} />
              <NumberField label="Height" value={settings.playerSprite.height} onChange={(v) => updateField("playerSprite.height", v)} min={1} max={100} step={1} />
            </div>
          </Section>

          {/* High Scores */}
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

        {/* Right: Live Preview */}
        <div className="lg:w-[520px] shrink-0">
          <div className="sticky top-6 rounded-xl border border-[#1e1e1e] bg-[#141414] p-5 space-y-4">
            <h3 className="font-semibold text-white">Live Preview</h3>
            <p className="text-xs text-neutral-500">
              Drag the dashed boxes to reposition elements. Pink = enemies (not draggable).
            </p>
            <GameEditorPreview
              settings={plat}
              playerSprite={settings.playerSprite}
              platform={platform}
              onChange={updatePlatform}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-5 space-y-4">
      <h3 className="font-semibold text-white text-sm">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
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

function NumberField({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
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

function TextArea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-[#00f0ff]" : "bg-neutral-700"}`}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </div>
      <span className="text-sm text-neutral-300">{label}</span>
    </label>
  );
}
