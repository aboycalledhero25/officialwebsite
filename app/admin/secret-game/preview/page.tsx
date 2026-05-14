"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ZoomIn, ZoomOut, Monitor, Smartphone, Save, Check } from "lucide-react";
import { GameEditorPreview } from "@/components/secret-game/game-editor-preview";
import { updateSecretGameSettings } from "@/lib/actions";
import type { SecretGameSettings, GamePlatformSettings, SpawnPoint } from "@/lib/data";

function padSpawnPoints(sp: any[]): [SpawnPoint, SpawnPoint, SpawnPoint, SpawnPoint, SpawnPoint, SpawnPoint] {
  const defaults: [SpawnPoint, SpawnPoint, SpawnPoint, SpawnPoint, SpawnPoint, SpawnPoint] = [
    { x: 40, y: 10, enabled: true },
    { x: 90, y: 10, enabled: true },
    { x: 150, y: 10, enabled: true },
    { x: 60, y: 30, enabled: true },
    { x: 120, y: 30, enabled: true },
    { x: 180, y: 30, enabled: true },
  ];
  if (!Array.isArray(sp) || sp.length === 0) return defaults;
  if (sp.length >= 6) return sp as [SpawnPoint, SpawnPoint, SpawnPoint, SpawnPoint, SpawnPoint, SpawnPoint];
  return [...sp, ...defaults.slice(sp.length)] as [SpawnPoint, SpawnPoint, SpawnPoint, SpawnPoint, SpawnPoint, SpawnPoint];
}

export default function FullscreenPreviewPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SecretGameSettings | null>(null);
  const [platform, setPlatform] = useState<"desktop" | "mobile">("desktop");
  const [previewZoom, setPreviewZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fullData, setFullData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((data) => {
        setFullData(data);
        let sg = data.secretGame ?? null;
        if (sg) {
          sg = {
            ...sg,
            desktop: { ...sg.desktop, spawnPoints: padSpawnPoints(sg.desktop?.spawnPoints) },
            mobile: { ...sg.mobile, spawnPoints: padSpawnPoints(sg.mobile?.spawnPoints) },
          };
        }
        setSettings(sg);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updatePlatform = useCallback((next: GamePlatformSettings) => {
    setSettings((prev) => prev ? { ...prev, [platform]: next } : prev);
  }, [platform]);

  const updateField = useCallback((path: string, value: any) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const keys = path.split(".");
      const next = { ...prev };
      let target: any = next;
      for (let i = 0; i < keys.length - 1; i++) { target[keys[i]] = { ...target[keys[i]] }; target = target[keys[i]]; }
      target[keys[keys.length - 1]] = value;
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!settings) return;
    setSaving(true); setSaveError(null); setSaveOk(false);
    try {
      await updateSecretGameSettings(settings);
      try {
        const freshPayload = { ...(fullData ?? {}), secretGame: settings };
        await fetch("/api/admin/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(freshPayload) });
      } catch {}
      setSaveOk(true); setTimeout(() => setSaveOk(false), 3000); router.refresh();
    } catch (err) { setSaveError(err instanceof Error ? err.message : String(err)); }
    finally { setSaving(false); }
  }, [settings, fullData, router]);

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a] text-neutral-500">
        Loading preview…
      </div>
    );
  }

  const plat = settings[platform];

  return (
    <div className="h-screen bg-[#0a0a0a] text-white overflow-hidden relative">
      {/* Toolbar — absolute overlay so canvas fills full viewport like the game */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 border-b border-[#1e1e1e] bg-[#0a0a0a]/90 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/secret-game")}
            className="flex items-center gap-2 rounded-lg bg-[#1e1e1e] hover:bg-[#2a2a2a] px-3 py-2 text-sm text-neutral-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-sm font-semibold text-neutral-200">Live Preview</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Platform toggle */}
          <div className="flex gap-1 rounded-lg border border-[#1e1e1e] bg-[#141414] p-1">
            <button
              onClick={() => setPlatform("desktop")}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${platform === "desktop" ? "bg-[#00f0ff] text-black" : "text-neutral-400 hover:text-white"}`}
            >
              <Monitor className="w-3.5 h-3.5" /> Desktop
            </button>
            <button
              onClick={() => setPlatform("mobile")}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${platform === "mobile" ? "bg-[#00f0ff] text-black" : "text-neutral-400 hover:text-white"}`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Mobile
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button onClick={() => setPreviewZoom((z) => Math.max(0.25, parseFloat((z - 0.25).toFixed(2))))} className="p-1.5 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-neutral-300 transition-colors"><ZoomOut className="w-4 h-4" /></button>
            <span className="text-xs text-neutral-400 w-12 text-center">{Math.round(previewZoom * 100)}%</span>
            <button onClick={() => setPreviewZoom((z) => Math.min(4, parseFloat((z + 0.25).toFixed(2))))} className="p-1.5 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-neutral-300 transition-colors"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => setPreviewZoom(1)} className="ml-1 px-2 py-1 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-neutral-400 text-xs transition-colors">Reset</button>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${saveOk ? "bg-green-600 text-white" : "bg-[#1e1e1e] hover:bg-[#2a2a2a] text-neutral-300"}`}
          >
            {saveOk ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saveOk ? "Saved" : saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="absolute top-[52px] left-0 right-0 z-50 bg-red-900/30 border-b border-red-800 text-red-300 text-xs px-4 py-1.5">
          Error: {saveError}
        </div>
      )}

      {/* Canvas area — fills full viewport, toolbar is overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative overflow-hidden"
          style={{
            width: platform === "desktop" ? "100%" : "min(100%, 420px)",
            height: platform === "desktop" ? "100%" : "auto",
            maxWidth: platform === "desktop" ? "100%" : "420px",
            maxHeight: platform === "desktop" ? "100%" : "100%",
            aspectRatio: platform === "desktop" ? undefined : "941 / 1672",
          }}
        >
          <GameEditorPreview
            settings={plat}
            playerSprite={settings.playerSprite}
            bossSettings={settings.boss}
            platform={platform}
            zoom={previewZoom}
            playerHitbox={settings.playerHitbox}
            hitboxPoints={settings.playerHitbox?.points}
            bulletSpawnOffsetX={settings.bulletSpawnOffsetX}
            bulletSpawnOffsetY={settings.bulletSpawnOffsetY}
            mouseFollowOffsetX={settings.mouseFollowOffsetX}
            mouseFollowOffsetY={settings.mouseFollowOffsetY}
            autoFireRange={settings.autoFireRange}
            spawnPoints={plat.spawnPoints}
            onChange={updatePlatform}
            onBossChange={(next) => setSettings((prev) => prev ? { ...prev, boss: next } : prev)}
            onHitboxChange={(points) => setSettings((prev) => prev ? { ...prev, playerHitbox: { ...(prev.playerHitbox ?? {}), points } } : prev)}
            onBulletSpawnChange={(ox, oy) => setSettings((prev) => prev ? { ...prev, bulletSpawnOffsetX: ox, bulletSpawnOffsetY: oy } : prev)}
            onMouseFollowChange={(ox, oy) => setSettings((prev) => prev ? { ...prev, mouseFollowOffsetX: ox, mouseFollowOffsetY: oy } : prev)}
            onSpawnPointsChange={(next) => updateField(`${platform}.spawnPoints`, next)}
            onPlayerSpriteChange={(next) => setSettings((prev) => prev ? { ...prev, playerSprite: next } : prev)}
            onPlayerHitboxChange={(next) => setSettings((prev) => prev ? { ...prev, playerHitbox: { ...(prev.playerHitbox ?? {}), ...next } } : prev)}
            onPermShieldChange={(next) => setSettings((prev) => prev ? { ...prev, permShield: next } : prev)}
          />
        </div>
      </div>
    </div>
  );
}
