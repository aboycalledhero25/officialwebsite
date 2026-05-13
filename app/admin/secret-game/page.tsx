"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Save, Gamepad2, RotateCcw, Play, Smartphone, Monitor, Trophy, ZoomIn, ZoomOut, Plus, Trash2, Volume2 } from "lucide-react";
import { GameEditorPreview } from "@/components/secret-game/game-editor-preview";
import { updateSecretGameSettings, resetLeaderboard, getLeaderboard, deleteScore, updateScore } from "@/lib/actions";
import { useRouter } from "next/navigation";
import type { SecretGameSettings, GamePlatformSettings } from "@/lib/data";
import { useAudioSfx, unlockAudio } from "@/components/secret-game/use-audio-sfx";

const DEFAULT_PLATFORM: GamePlatformSettings = {
  player: { x: 115, y: 265 },
  hearts: { visible: true, x: 190, y: 8, size: 28 },
  arrowKeys: { visible: false, x: 8, y: 280, size: 40 },
  touchArea: { visible: false, x: 0, y: 200, width: 240, height: 120 },
  fireButton: { visible: true, x: 200, y: 270, size: 44 },
  score: { visible: true, x: 8, y: 8, size: 14 },
  wave: { visible: true, x: 120, y: 8, size: 14 },
  powerUps: { visible: true, x: 120, y: 28, size: 8 },
  shield: { offsetX: 0, offsetY: 0, radius: 16 },
  enemy: {
    speed: 18,
    fireRate: 0.003,
    projectileSpeed: 60,
    projectileSize: 10,
    columns: 5,
    rows: 3,
    startY: 30,
    offsetX: 0,
    paddingX: 6,
    paddingY: 8,
    dropDistance: 6,
    width: 32,
    height: 28,
    spriteScale: 1,
  },
  bossHealthBar: { visible: true, x: 90, y: 4, size: 6 },
  boss: { x: 100, y: 20 },
};

export default function SecretGameAdminPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SecretGameSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [platform, setPlatform] = useState<"desktop" | "mobile">("desktop");
  const [resettingBoard, setResettingBoard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ id: string; name: string; score: number; wave: number; created_at: string }[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [editingScore, setEditingScore] = useState<{ id: string; name: string; score: number; wave: number } | null>(null);
  // Stores the full data.json payload so we can POST it back to bust the in-memory cache
  // after a save (the server action writes to Supabase but doesn't update the route's memCache).
  const fullDataRef = useRef<Record<string, unknown> | null>(null);
  const { play, playFile } = useAudioSfx();

  useEffect(() => {
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((data) => {
        fullDataRef.current = data;
        const sg = data.secretGame || {};
        // Ensure new fields exist with defaults
        const merged: SecretGameSettings = {
          enabled: sg.enabled ?? true,
          title: sg.title ?? "HERO INVADERS",
          instructions: sg.instructions ?? "Defend the stage from the invasion!",
          playerSprite: sg.playerSprite ?? { offsetX: -2, offsetY: -12, width: 14, height: 42 },
          powerUpSpawnChance: sg.powerUpSpawnChance ?? 0.12,
          bossProjectileDropRate: sg.bossProjectileDropRate ?? 0.15,
          powerUpSize: sg.powerUpSize ?? 8,
          powerUpDurations: sg.powerUpDurations ?? { rapid: 5, wideShot: 4, invincible: 4 },
          enemyBaseHp: sg.enemyBaseHp ?? 1,
          enemyHpPerWave: sg.enemyHpPerWave ?? 0,
          enemyCollisionDamage: sg.enemyCollisionDamage ?? 1,
          enemyCollisionDamagePerWave: sg.enemyCollisionDamagePerWave ?? 0,
          enemyProjectileDamage: sg.enemyProjectileDamage ?? 1,
          enemyProjectileDamagePerWave: sg.enemyProjectileDamagePerWave ?? 0,
          enemyProjectileSpeedPerWave: sg.enemyProjectileSpeedPerWave ?? 0,
          impacts: sg.impacts ?? { playerBullet: { w: 28, h: 28 }, enemyBullet: { w: 20, h: 20 } },
          powerUpDropRates: sg.powerUpDropRates ?? { rapid: 1, wideshot: 1, extralife: 1, invincible: 1 },
          waveRewardEnabled: sg.waveRewardEnabled ?? true,
          enemyChoiceDropChance: sg.enemyChoiceDropChance ?? 0.05,
          disabledPowerUps: sg.disabledPowerUps ?? [],
          boss: sg.boss ?? {
            enabled: true,
            interval: 10,
            baseHealth: 500,
            healthIncrease: 500,
            bulletDamage: 20,
            projectileSpeed: 80,
            projectileSize: 10,
            fireInterval: 3,
            trackSpeed: 30,
            width: 40,
            height: 30,
            scoreReward: 500,
          },
          roguelikeConfig: sg.roguelikeConfig ?? {},
          playerHitbox: sg.playerHitbox ?? {},
          bulletSpawnOffsetX: sg.bulletSpawnOffsetX,
          bulletSpawnOffsetY: sg.bulletSpawnOffsetY,
          // Boss HP per wave group (index 0 = Boss 1, index 1 = Boss 2, …)
          bossHealthPerWaveGroup: sg.bossHealthPerWaveGroup ?? [],
          // Per-sound volume multipliers for the admin mixer
          sfxVolumes: sg.sfxVolumes ?? {},
          damageNumbers: sg.damageNumbers ?? {},
          desktop: {
            ...DEFAULT_PLATFORM,
            ...sg.desktop,
            enemy: { ...DEFAULT_PLATFORM.enemy, ...(sg.desktop?.enemy ?? {}) },
          },
          mobile: {
            ...DEFAULT_PLATFORM,
            ...sg.mobile,
            enemy: { ...DEFAULT_PLATFORM.enemy, ...(sg.mobile?.enemy ?? {}) },
          },
        };
        setSettings(merged);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    try {
      const hs = localStorage.getItem("abch-guitar-invaders-highscore");
      if (hs) setHighScore(parseInt(hs, 10));
    } catch {}

    getLeaderboard(100)
      .then((data) => {
        setLeaderboard(data);
        setLeaderboardLoading(false);
      })
      .catch(() => setLeaderboardLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      await updateSecretGameSettings(settings);
      // Bust the in-memory data cache in /api/admin/data so the game page and
      // DataProvider immediately see the new settings on their next fetch.
      try {
        const freshPayload = { ...(fullDataRef.current ?? {}), secretGame: settings };
        await fetch("/api/admin/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(freshPayload),
        });
      } catch {
        // Non-fatal — Supabase already has the correct data; this just speeds up propagation.
      }
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [settings, router]);

  const handleResetHighScore = useCallback(() => {
    try {
      localStorage.removeItem("abch-guitar-invaders-highscore");
      setHighScore(0);
    } catch {}
  }, []);

  const handleResetLeaderboard = useCallback(async () => {
    if (!confirm("Are you sure you want to delete ALL leaderboard scores? This cannot be undone.")) return;
    setResettingBoard(true);
    try {
      await resetLeaderboard();
      setLeaderboard([]);
      alert("Leaderboard reset successfully.");
    } catch {
      alert("Failed to reset leaderboard.");
    } finally {
      setResettingBoard(false);
    }
  }, []);

  const handleDeleteScore = useCallback(async (id: string) => {
    if (!confirm("Delete this score?")) return;
    try {
      await deleteScore(id);
      setLeaderboard((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Failed to delete score.");
    }
  }, []);

  const handleUpdateScore = useCallback(async () => {
    if (!editingScore) return;
    try {
      await updateScore(editingScore.id, editingScore.name, editingScore.score, editingScore.wave);
      setLeaderboard((prev) =>
        prev
          .map((s) =>
            s.id === editingScore.id
              ? { ...s, name: editingScore.name, score: editingScore.score, wave: editingScore.wave }
              : s
          )
          .sort((a, b) => b.score - a.score)
      );
      setEditingScore(null);
    } catch {
      alert("Failed to update score.");
    }
  }, [editingScore]);

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
        <div className="flex items-center gap-2 flex-wrap">
          {saveOk && (
            <span className="text-xs text-green-400 font-semibold">✓ Saved!</span>
          )}
          {saveError && (
            <span className="text-xs text-red-400 font-semibold" title={saveError}>✗ Save failed</span>
          )}
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

      {/* Platform toggle + Two-column layout
          Mobile platform  → forms flex-1 (left), phone preview fixed-width (right)
          Desktop platform → forms fixed-width (left), wide preview flex-1 (right)
          so the desktop preview can grow to fill the full available admin width.     */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings forms */}
        <div className={`space-y-4 ${platform === "desktop" ? "lg:w-[420px] shrink-0" : "flex-1 min-w-0"}`}>
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
          <Section title={`Enemy Grid (${platform})`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <NumberField label="Columns" value={plat.enemy.columns} onChange={(v) => updateField(`${platform}.enemy.columns`, v)} min={1} max={20} step={1} />
              <NumberField label="Rows" value={plat.enemy.rows} onChange={(v) => updateField(`${platform}.enemy.rows`, v)} min={1} max={20} step={1} />
              <NumberField label="Cell Width" value={plat.enemy.width} onChange={(v) => updateField(`${platform}.enemy.width`, v)} min={4} max={200} step={1} />
              <NumberField label="Cell Height" value={plat.enemy.height} onChange={(v) => updateField(`${platform}.enemy.height`, v)} min={4} max={200} step={1} />
              <NumberField label="Pad X" value={plat.enemy.paddingX} onChange={(v) => updateField(`${platform}.enemy.paddingX`, v)} min={-100} max={100} step={1} />
              <NumberField label="Pad Y" value={plat.enemy.paddingY} onChange={(v) => updateField(`${platform}.enemy.paddingY`, v)} min={-100} max={100} step={1} />
              <NumberField label="Start Y" value={plat.enemy.startY} onChange={(v) => updateField(`${platform}.enemy.startY`, v)} min={0} max={300} step={1} />
              <NumberField label="Offset X" value={plat.enemy.offsetX} onChange={(v) => updateField(`${platform}.enemy.offsetX`, v)} min={-120} max={120} step={1} />
              <NumberField label="Drop Distance" value={plat.enemy.dropDistance} onChange={(v) => updateField(`${platform}.enemy.dropDistance`, v)} min={1} max={40} step={1} />
            </div>
            <NumberField label="Sprite Scale" value={(plat.enemy as { spriteScale?: number }).spriteScale ?? 1} onChange={(v) => updateField(`${platform}.enemy.spriteScale`, v)} min={0.1} max={5} step={0.05} />
            <p className="text-xs text-neutral-500 -mt-2">Scales the sprite visually only — does not affect grid spacing or collision.</p>
          </Section>

          <Section title="Enemy Combat">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <NumberField label="Speed" value={plat.enemy.speed} onChange={(v) => updateField(`${platform}.enemy.speed`, v)} min={0} max={200} step={1} />
              <NumberField label="Fire Rate" value={plat.enemy.fireRate} onChange={(v) => updateField(`${platform}.enemy.fireRate`, v)} min={0} max={1} step={0.001} />
              <NumberField label="Projectile Speed" value={plat.enemy.projectileSpeed} onChange={(v) => updateField(`${platform}.enemy.projectileSpeed`, v)} min={0} max={300} step={1} />
              <NumberField label="Projectile Size" value={plat.enemy.projectileSize} onChange={(v) => updateField(`${platform}.enemy.projectileSize`, v)} min={1} max={200} step={1} />
            </div>
          </Section>

          {/* Enemy Hitbox */}
          <Section title={`Enemy Hitbox (${platform})`}>
            <p className="text-xs text-neutral-500 mb-3">Collision box for player-bullet vs enemy detection. Offset is from the top-left of the grid cell. Defaults to the full cell size.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Offset X" value={(plat.enemy as {hitboxOffsetX?:number}).hitboxOffsetX ?? 0} onChange={(v) => updateField(`${platform}.enemy.hitboxOffsetX`, v)} min={-100} max={100} step={1} />
              <NumberField label="Offset Y" value={(plat.enemy as {hitboxOffsetY?:number}).hitboxOffsetY ?? 0} onChange={(v) => updateField(`${platform}.enemy.hitboxOffsetY`, v)} min={-100} max={100} step={1} />
              <NumberField label="Width" value={(plat.enemy as {hitboxWidth?:number}).hitboxWidth ?? plat.enemy.width} onChange={(v) => updateField(`${platform}.enemy.hitboxWidth`, v)} min={1} max={200} step={1} />
              <NumberField label="Height" value={(plat.enemy as {hitboxHeight?:number}).hitboxHeight ?? plat.enemy.height} onChange={(v) => updateField(`${platform}.enemy.hitboxHeight`, v)} min={1} max={200} step={1} />
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

          {/* Score */}
          <Section title="Score Display">
            <div className="flex items-center gap-4 mb-3">
              <Toggle label="Visible" checked={plat.score.visible} onChange={(v) => updateField(`${platform}.score.visible`, v)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <NumberField label="X" value={plat.score.x} onChange={(v) => updateField(`${platform}.score.x`, v)} min={0} max={240} step={1} />
              <NumberField label="Y" value={plat.score.y} onChange={(v) => updateField(`${platform}.score.y`, v)} min={0} max={320} step={1} />
              <NumberField label="Size" value={plat.score.size ?? 14} onChange={(v) => updateField(`${platform}.score.size`, v)} min={4} max={64} step={1} />
            </div>
          </Section>

          {/* Wave */}
          <Section title="Wave Display">
            <div className="flex items-center gap-4 mb-3">
              <Toggle label="Visible" checked={plat.wave.visible} onChange={(v) => updateField(`${platform}.wave.visible`, v)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <NumberField label="X" value={plat.wave.x} onChange={(v) => updateField(`${platform}.wave.x`, v)} min={0} max={240} step={1} />
              <NumberField label="Y" value={plat.wave.y} onChange={(v) => updateField(`${platform}.wave.y`, v)} min={0} max={320} step={1} />
              <NumberField label="Size" value={plat.wave.size ?? 14} onChange={(v) => updateField(`${platform}.wave.size`, v)} min={4} max={64} step={1} />
            </div>
          </Section>

          {/* Power-ups */}
          <Section title="Power-Up Indicator">
            <div className="flex items-center gap-4 mb-3">
              <Toggle label="Visible" checked={plat.powerUps.visible} onChange={(v) => updateField(`${platform}.powerUps.visible`, v)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <NumberField label="X" value={plat.powerUps.x} onChange={(v) => updateField(`${platform}.powerUps.x`, v)} min={0} max={240} step={1} />
              <NumberField label="Y" value={plat.powerUps.y} onChange={(v) => updateField(`${platform}.powerUps.y`, v)} min={0} max={320} step={1} />
              <NumberField label="Size" value={plat.powerUps.size ?? 8} onChange={(v) => updateField(`${platform}.powerUps.size`, v)} min={4} max={64} step={1} />
            </div>
          </Section>

          {/* HUD Controls (Pause / Mute / Fullscreen) */}
          <Section title="HUD Controls (Pause / Mute / Fullscreen)">
            <p className="text-xs text-neutral-500 mb-3">Position of the control button row in game-logical units (240 × 320). Buttons flow left-to-right from this point.</p>
            <div className="grid grid-cols-3 gap-4">
              <NumberField label="X" value={plat.controls?.x ?? 152} onChange={(v) => updateField(`${platform}.controls.x`, v)} min={0} max={240} step={1} />
              <NumberField label="Y" value={plat.controls?.y ?? 4} onChange={(v) => updateField(`${platform}.controls.y`, v)} min={0} max={320} step={1} />
              <NumberField label="Button Size" value={plat.controls?.size ?? 24} onChange={(v) => updateField(`${platform}.controls.size`, v)} min={12} max={48} step={1} />
            </div>
          </Section>

          {/* Shield */}
          <Section title="Shield Bubble">
            <div className="grid grid-cols-3 gap-4">
              <NumberField label="Offset X" value={plat.shield.offsetX} onChange={(v) => updateField(`${platform}.shield.offsetX`, v)} step={1} />
              <NumberField label="Offset Y" value={plat.shield.offsetY} onChange={(v) => updateField(`${platform}.shield.offsetY`, v)} step={1} />
              <NumberField label="Radius" value={plat.shield.radius} onChange={(v) => updateField(`${platform}.shield.radius`, v)} min={1} max={100} step={1} />
            </div>
          </Section>

          {/* Power-up Spawn Rate */}
          <Section title="Power-Up Settings">
            <div className="grid grid-cols-1 gap-4">
              <NumberField
                label="Spawn Chance (0–1)"
                value={settings.powerUpSpawnChance}
                onChange={(v) => updateField("powerUpSpawnChance", v)}
                min={0}
                max={1}
                step={0.01}
              />
              <NumberField
                label="Boss Projectile Drop Rate (0–1)"
                value={settings.bossProjectileDropRate}
                onChange={(v) => updateField("bossProjectileDropRate", v)}
                min={0}
                max={1}
                step={0.01}
              />
              <NumberField
                label="Power-Up Size (px)"
                value={settings.powerUpSize}
                onChange={(v) => updateField("powerUpSize", v)}
                min={4}
                max={32}
                step={1}
              />
              <div className="grid grid-cols-3 gap-4">
                <NumberField
                  label="Rapid Fire (sec)"
                  value={settings.powerUpDurations.rapid}
                  onChange={(v) => updateField("powerUpDurations.rapid", v)}
                  min={1}
                  max={60}
                  step={1}
                />
                <NumberField
                  label="Wide Shot (sec)"
                  value={settings.powerUpDurations.wideShot}
                  onChange={(v) => updateField("powerUpDurations.wideShot", v)}
                  min={1}
                  max={60}
                  step={1}
                />
                <NumberField
                  label="Invincible (sec)"
                  value={settings.powerUpDurations.invincible}
                  onChange={(v) => updateField("powerUpDurations.invincible", v)}
                  min={1}
                  max={60}
                  step={1}
                />
              </div>
              <p className="text-xs text-neutral-500">Chance to drop a power-up when an enemy is killed. 0.12 = 12%.</p>
            </div>
          </Section>

          {/* Enemy HP Scaling */}
          <Section title="Enemy HP Scaling">
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Base HP (Wave 1)"
                value={settings.enemyBaseHp ?? 1}
                onChange={(v) => updateField("enemyBaseHp", v)}
                min={1}
                max={50}
                step={1}
              />
              <NumberField
                label="Extra HP Per Wave"
                value={settings.enemyHpPerWave ?? 0}
                onChange={(v) => updateField("enemyHpPerWave", v)}
                min={0}
                max={20}
                step={1}
              />
            </div>
            <p className="text-xs text-neutral-500 mt-2">Enemy HP at wave N = Base HP + (N − 1) × Extra HP Per Wave. Set Extra to 0 for one-hit enemies throughout.</p>
          </Section>

          {/* Per-Wave Enemy Damage Scaling */}
          <Section title="Enemy Damage Scaling (Per Wave)">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <NumberField
                label="Collision Damage (Base)"
                value={settings.enemyCollisionDamage ?? 1}
                onChange={(v) => updateField("enemyCollisionDamage", v)}
                min={1}
                max={20}
                step={1}
              />
              <NumberField
                label="Collision Dmg Per Wave"
                value={settings.enemyCollisionDamagePerWave ?? 0}
                onChange={(v) => updateField("enemyCollisionDamagePerWave", v)}
                min={0}
                max={10}
                step={1}
              />
              <NumberField
                label="Projectile Damage (Base)"
                value={settings.enemyProjectileDamage ?? 1}
                onChange={(v) => updateField("enemyProjectileDamage", v)}
                min={1}
                max={20}
                step={1}
              />
              <NumberField
                label="Projectile Dmg Per Wave"
                value={settings.enemyProjectileDamagePerWave ?? 0}
                onChange={(v) => updateField("enemyProjectileDamagePerWave", v)}
                min={0}
                max={10}
                step={1}
              />
              <NumberField
                label="Projectile Speed Per Wave"
                value={settings.enemyProjectileSpeedPerWave ?? 0}
                onChange={(v) => updateField("enemyProjectileSpeedPerWave", v)}
                min={0}
                max={50}
                step={1}
              />
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Collision damage = Base + (Wave − 1) × Per Wave (slices removed on body contact). Projectile damage = same formula (slices removed by enemy bullets). Projectile speed increases by Per Wave each wave.
            </p>
          </Section>

          {/* Reward Screen */}
          <Section title="Reward Screen">
            <Toggle
              label="Show power-up selection after every wave"
              checked={settings.waveRewardEnabled ?? true}
              onChange={(v) => updateField("waveRewardEnabled", v)}
            />
            <p className="text-xs text-neutral-500">When on, the permanent power-up selection screen appears after clearing each wave. When off, only boss defeats trigger it.</p>
            <NumberField
              label="Enemy Choice Drop Chance (0–1)"
              value={settings.enemyChoiceDropChance ?? 0}
              onChange={(v) => updateField("enemyChoiceDropChance", v)}
              min={0}
              max={1}
              step={0.01}
            />
            <p className="text-xs text-neutral-500">Chance (0–1) that a killed enemy drops a turquoise arrow pickup. Collecting it opens the power-up selection screen mid-wave. 0.05 = 5%.</p>
          </Section>

          {/* Power-Up Drop Rates */}
          <Section title="Power-Up Drop Rates">
            <p className="text-xs text-neutral-500 mb-3">Relative spawn weights — they&apos;re normalised automatically, so only the ratios matter. Set to 0 to disable a type.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <NumberField label="Rapid Fire" value={settings.powerUpDropRates?.rapid ?? 1} onChange={(v) => updateField("powerUpDropRates.rapid", v)} min={0} max={100} step={1} />
              <NumberField label="Wide Shot" value={settings.powerUpDropRates?.wideshot ?? 1} onChange={(v) => updateField("powerUpDropRates.wideshot", v)} min={0} max={100} step={1} />
              <NumberField label="Extra Life" value={settings.powerUpDropRates?.extralife ?? 1} onChange={(v) => updateField("powerUpDropRates.extralife", v)} min={0} max={100} step={1} />
              <NumberField label="Invincible" value={settings.powerUpDropRates?.invincible ?? 1} onChange={(v) => updateField("powerUpDropRates.invincible", v)} min={0} max={100} step={1} />
            </div>
          </Section>

          {/* Impact Effect Sizes */}
          <Section title="Impact Effect Sizes">
            <p className="text-xs text-neutral-500 mb-3">Size of each GIF explosion effect in game units. Adjust per effect type independently.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Player Bullet W" value={settings.impacts?.playerBullet?.w ?? 50} onChange={(v) => updateField("impacts.playerBullet.w", v)} min={4} max={400} step={1} />
              <NumberField label="Player Bullet H" value={settings.impacts?.playerBullet?.h ?? 50} onChange={(v) => updateField("impacts.playerBullet.h", v)} min={4} max={400} step={1} />
              <NumberField label="Enemy Bullet W" value={settings.impacts?.enemyBullet?.w ?? 50} onChange={(v) => updateField("impacts.enemyBullet.w", v)} min={4} max={400} step={1} />
              <NumberField label="Enemy Bullet H" value={settings.impacts?.enemyBullet?.h ?? 50} onChange={(v) => updateField("impacts.enemyBullet.h", v)} min={4} max={400} step={1} />
              <NumberField label="Lightning W" value={(settings.impacts as {lightning?:{w:number;h:number}})?.lightning?.w ?? 40} onChange={(v) => updateField("impacts.lightning.w", v)} min={4} max={400} step={1} />
              <NumberField label="Lightning H" value={(settings.impacts as {lightning?:{w:number;h:number}})?.lightning?.h ?? 40} onChange={(v) => updateField("impacts.lightning.h", v)} min={4} max={400} step={1} />
              <NumberField label="Bomb W" value={(settings.impacts as {bomb?:{w:number;h:number}})?.bomb?.w ?? 60} onChange={(v) => updateField("impacts.bomb.w", v)} min={4} max={400} step={1} />
              <NumberField label="Bomb H" value={(settings.impacts as {bomb?:{w:number;h:number}})?.bomb?.h ?? 60} onChange={(v) => updateField("impacts.bomb.h", v)} min={4} max={400} step={1} />
              <NumberField label="Boss W" value={(settings.impacts as {boss?:{w:number;h:number}})?.boss?.w ?? 80} onChange={(v) => updateField("impacts.boss.w", v)} min={4} max={400} step={1} />
              <NumberField label="Boss H" value={(settings.impacts as {boss?:{w:number;h:number}})?.boss?.h ?? 80} onChange={(v) => updateField("impacts.boss.h", v)} min={4} max={400} step={1} />
              <NumberField label="Nuke W" value={(settings.impacts as {nuke?:{w:number;h:number}})?.nuke?.w ?? 100} onChange={(v) => updateField("impacts.nuke.w", v)} min={4} max={400} step={1} />
              <NumberField label="Nuke H" value={(settings.impacts as {nuke?:{w:number;h:number}})?.nuke?.h ?? 100} onChange={(v) => updateField("impacts.nuke.h", v)} min={4} max={400} step={1} />
              <NumberField label="Virus W" value={(settings.impacts as {virus?:{w:number;h:number}})?.virus?.w ?? 30} onChange={(v) => updateField("impacts.virus.w", v)} min={4} max={400} step={1} />
              <NumberField label="Virus H" value={(settings.impacts as {virus?:{w:number;h:number}})?.virus?.h ?? 30} onChange={(v) => updateField("impacts.virus.h", v)} min={4} max={400} step={1} />
            </div>
          </Section>

          {/* Damage Numbers */}
          <Section title="Damage Numbers">
            <p className="text-xs text-neutral-500 mb-3">
              Floating numbers that appear when enemies or the player are hit. Colors are CSS hex values (e.g. <code>#ffffff</code>).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">Player Bullet Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.damageNumbers?.playerBulletColor ?? "#ffffff"} onChange={(e) => updateField("damageNumbers.playerBulletColor", e.target.value)} className="h-8 w-12 rounded cursor-pointer bg-transparent border border-neutral-700" />
                  <span className="text-xs text-neutral-400 font-mono">{settings.damageNumbers?.playerBulletColor ?? "#ffffff"}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">Seeker Missile Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.damageNumbers?.seekerColor ?? "#ff4400"} onChange={(e) => updateField("damageNumbers.seekerColor", e.target.value)} className="h-8 w-12 rounded cursor-pointer bg-transparent border border-neutral-700" />
                  <span className="text-xs text-neutral-400 font-mono">{settings.damageNumbers?.seekerColor ?? "#ff4400"}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">Orbital Orb Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.damageNumbers?.orbitalColor ?? "#00f0ff"} onChange={(e) => updateField("damageNumbers.orbitalColor", e.target.value)} className="h-8 w-12 rounded cursor-pointer bg-transparent border border-neutral-700" />
                  <span className="text-xs text-neutral-400 font-mono">{settings.damageNumbers?.orbitalColor ?? "#00f0ff"}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">Player Hit Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.damageNumbers?.playerHitColor ?? "#ff4444"} onChange={(e) => updateField("damageNumbers.playerHitColor", e.target.value)} className="h-8 w-12 rounded cursor-pointer bg-transparent border border-neutral-700" />
                  <span className="text-xs text-neutral-400 font-mono">{settings.damageNumbers?.playerHitColor ?? "#ff4444"}</span>
                </div>
              </div>
              <NumberField label="Drift Speed (px/s)" value={settings.damageNumbers?.driftSpeed ?? 18} onChange={(v) => updateField("damageNumbers.driftSpeed", v)} min={1} max={100} step={1} />
              <NumberField label="Font Size (px)" value={settings.damageNumbers?.fontSize ?? 8} onChange={(v) => updateField("damageNumbers.fontSize", v)} min={4} max={32} step={1} />
            </div>
          </Section>

          {/* Roguelike Config */}
          {(() => {
            const rc = settings.roguelikeConfig ?? {};
            const rf        = rc.rapidFire   ?? { ratePerStack: 0.02, minCooldown: 0.05 };
            const mg        = rc.machineGun  ?? { baseBurst: 3, burstPerStack: 1, burstSpread: 0.1, burstDelay: 0.07 };
            const frenzy    = rc.frenzy      ?? { cooldown: 30, damage: 20, baseProjectiles: 8, projectilesPerStack: 2 };
            const bomb      = rc.bomb        ?? { cooldown: 30, damage: 20, bombsPerStack: 1, crossRadius: 30 };
            const lightning = rc.lightning   ?? { cooldown: 30, damage: 50, baseStrikes: 3, strikesPerStack: 1 };
            const connect   = rc.connect     ?? { damage: 50, damagePerStack: 25 };
            const seeker    = rc.seeker      ?? { missileDamage: 150, missileCooldown: 15, missilesPerStack: 1 };
            const orbital   = rc.orbital     ?? { damage: 30, orbitSpeed: 2.5, orbSize: 8, cooldown: 10, orbitRadius: 35, duration: 10 };
            const virus     = rc.virus       ?? { baseInfectionChance: 0.2, chancePerStack: 0.05, baseDamagePerTick: 10, damagePerStack: 5, duration: 3, maxVirusStacks: 3 };
            const nuke      = rc.nuke        ?? { cooldown: 30, bossHPReduction: 0.25, nukesPerStack: 1 };
            const shield    = rc.shield      ?? { duration: 10, cooldown: 30 };
            const speed     = rc.speed       ?? { speedPerStack: 0.01 };
            const strength  = rc.strength    ?? { damagePerStack: 0.02 };
            const proj      = rc.projectile  ?? { projectilesPerStack: 1, superBulletThreshold: 10, superBulletSizeMultiplier: 2.5 };
            const luck      = rc.luck        ?? { dropChancePerStack: 0.01 };
            const extraLife = rc.extraLife   ?? { heartsPerStack: 1 };
            const upRc = (key: string, val: object) =>
              updateField("roguelikeConfig", { ...settings.roguelikeConfig, [key]: { ...(settings.roguelikeConfig as Record<string,object> ?? {})[key], ...val } });
            return (<>
              <Section title="Player Base Stats">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <NumberField label="Starting Hearts" value={rc.startingHearts ?? 3} onChange={(v) => updateField("roguelikeConfig.startingHearts", v)} min={1} max={10} step={1} />
                  <NumberField label="Base Reload (s)" value={rc.baseReloadTime ?? 0.35} onChange={(v) => updateField("roguelikeConfig.baseReloadTime", v)} min={0.05} max={2} step={0.01} />
                  <NumberField label="Move Speed" value={rc.baseMovementSpeed ?? 90} onChange={(v) => updateField("roguelikeConfig.baseMovementSpeed", v)} min={10} max={300} step={5} />
                  <NumberField label="Bullet Damage" value={rc.baseBulletDamage ?? 20} onChange={(v) => updateField("roguelikeConfig.baseBulletDamage", v)} min={1} max={500} step={5} />
                </div>
              </Section>
              <Section title="Rapid Fire (temp power-up)">
                <div className="grid grid-cols-2 gap-4">
                  <NumberField label="Rate/Stack" value={rf.ratePerStack ?? 0.02} onChange={(v) => upRc("rapidFire", { ratePerStack: v })} min={0} max={0.5} step={0.005} />
                  <NumberField label="Min Cooldown (s)" value={rf.minCooldown ?? 0.05} onChange={(v) => upRc("rapidFire", { minCooldown: v })} min={0.01} max={1} step={0.01} />
                </div>
              </Section>
              <Section title="Machine Gun (perm upgrade)">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <NumberField label="Base Burst" value={mg.baseBurst ?? 3} onChange={(v) => upRc("machineGun", { baseBurst: v })} min={1} max={20} step={1} />
                  <NumberField label="Burst/Stack" value={mg.burstPerStack ?? 1} onChange={(v) => upRc("machineGun", { burstPerStack: v })} min={0} max={10} step={1} />
                  <NumberField label="Spread (rad)" value={mg.burstSpread ?? 0.1} onChange={(v) => upRc("machineGun", { burstSpread: v })} min={0} max={1} step={0.01} />
                  <NumberField label="Burst Delay (s)" value={mg.burstDelay ?? 0.07} onChange={(v) => upRc("machineGun", { burstDelay: v })} min={0.01} max={0.5} step={0.01} />
                </div>
              </Section>
              <Section title="Frenzy (perm upgrade)">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <NumberField label="Base Projectiles" value={frenzy.baseProjectiles ?? 8} onChange={(v) => upRc("frenzy", { baseProjectiles: v })} min={1} max={30} step={1} />
                  <NumberField label="Projectiles/Stack" value={frenzy.projectilesPerStack ?? 2} onChange={(v) => upRc("frenzy", { projectilesPerStack: v })} min={0} max={10} step={1} />
                  <NumberField label="Damage" value={frenzy.damage ?? 20} onChange={(v) => upRc("frenzy", { damage: v })} min={1} max={500} step={5} />
                  <NumberField label="Cooldown (s)" value={frenzy.cooldown ?? 30} onChange={(v) => upRc("frenzy", { cooldown: v })} min={1} max={120} step={1} />
                </div>
              </Section>
              <Section title="Bomb (perm upgrade)">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <NumberField label="Bombs/Stack" value={bomb.bombsPerStack ?? 1} onChange={(v) => upRc("bomb", { bombsPerStack: v })} min={1} max={10} step={1} />
                  <NumberField label="Cross Radius" value={bomb.crossRadius ?? 30} onChange={(v) => upRc("bomb", { crossRadius: v })} min={5} max={200} step={1} />
                  <NumberField label="Damage" value={bomb.damage ?? 20} onChange={(v) => upRc("bomb", { damage: v })} min={1} max={500} step={5} />
                  <NumberField label="Cooldown (s)" value={bomb.cooldown ?? 30} onChange={(v) => upRc("bomb", { cooldown: v })} min={1} max={120} step={1} />
                </div>
              </Section>
              <Section title="Lightning (perm upgrade)">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <NumberField label="Base Strikes" value={lightning.baseStrikes ?? 3} onChange={(v) => upRc("lightning", { baseStrikes: v })} min={1} max={20} step={1} />
                  <NumberField label="Strikes/Stack" value={lightning.strikesPerStack ?? 1} onChange={(v) => upRc("lightning", { strikesPerStack: v })} min={0} max={10} step={1} />
                  <NumberField label="Damage" value={lightning.damage ?? 50} onChange={(v) => upRc("lightning", { damage: v })} min={1} max={1000} step={10} />
                  <NumberField label="Cooldown (s)" value={lightning.cooldown ?? 30} onChange={(v) => upRc("lightning", { cooldown: v })} min={1} max={120} step={1} />
                </div>
              </Section>
              <Section title="Connect Beam (perm upgrade)">
                <div className="grid grid-cols-2 gap-4">
                  <NumberField label="Base Damage" value={connect.damage ?? 50} onChange={(v) => upRc("connect", { damage: v })} min={1} max={1000} step={5} />
                  <NumberField label="Damage/Stack" value={connect.damagePerStack ?? 25} onChange={(v) => upRc("connect", { damagePerStack: v })} min={0} max={500} step={5} />
                </div>
              </Section>
              <Section title="Seeker Missile (perm upgrade)">
                <p className="text-xs text-neutral-500 mb-3">Auto-fires homing missiles at the nearest enemy. Each stack adds another missile per volley.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <NumberField label="Missile Damage" value={seeker.missileDamage ?? 150} onChange={(v) => upRc("seeker", { missileDamage: v })} min={1} max={1000} step={5} />
                  <NumberField label="Cooldown (s)" value={seeker.missileCooldown ?? 15} onChange={(v) => upRc("seeker", { missileCooldown: v })} min={1} max={60} step={1} />
                  <NumberField label="Missiles/Stack" value={seeker.missilesPerStack ?? 1} onChange={(v) => upRc("seeker", { missilesPerStack: v })} min={1} max={5} step={1} />
                </div>
              </Section>
              <Section title="Orbital (perm upgrade)">
                <p className="text-xs text-neutral-500 mb-3">Energy orbs orbit the player, damaging enemies on contact. Each stack adds another orb.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <NumberField label="Orb Damage" value={orbital.damage ?? 30} onChange={(v) => upRc("orbital", { damage: v })} min={1} max={500} step={5} />
                  <NumberField label="Orbit Speed (rad/s)" value={orbital.orbitSpeed ?? 2.5} onChange={(v) => upRc("orbital", { orbitSpeed: v })} min={0.1} max={20} step={0.1} />
                  <NumberField label="Orb Size (px)" value={orbital.orbSize ?? 8} onChange={(v) => upRc("orbital", { orbSize: v })} min={2} max={30} step={1} />
                  <NumberField label="Orbit Radius (px)" value={orbital.orbitRadius ?? 35} onChange={(v) => upRc("orbital", { orbitRadius: v })} min={10} max={100} step={1} />
                  <NumberField label="Active Duration (s)" value={orbital.duration ?? 10} onChange={(v) => upRc("orbital", { duration: v })} min={1} max={60} step={1} />
                  <NumberField label="Cooldown (s)" value={orbital.cooldown ?? 10} onChange={(v) => upRc("orbital", { cooldown: v })} min={1} max={60} step={1} />
                </div>
              </Section>
              <Section title="Super Bullet (perm upgrade — Projectile stacking)">
                <p className="text-xs text-neutral-500 mb-3">When projectiles reach the threshold, they merge into a single super bullet. Tier 1 (Red) at threshold, Tier 2 (Purple) at 2×, Tier 3 (Gold) at 3×.</p>
                <div className="grid grid-cols-2 gap-4">
                  <NumberField label="Super Bullet Threshold" value={proj.superBulletThreshold ?? 10} onChange={(v) => upRc("projectile", { superBulletThreshold: v })} min={2} max={50} step={1} />
                  <NumberField label="Size Multiplier" value={proj.superBulletSizeMultiplier ?? 2.5} onChange={(v) => upRc("projectile", { superBulletSizeMultiplier: v })} min={1} max={10} step={0.1} />
                </div>
              </Section>
              <Section title="Virus (perm upgrade)">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <NumberField label="Infect Chance" value={virus.baseInfectionChance ?? 0.2} onChange={(v) => upRc("virus", { baseInfectionChance: v })} min={0} max={1} step={0.01} />
                  <NumberField label="Chance/Stack" value={virus.chancePerStack ?? 0.05} onChange={(v) => upRc("virus", { chancePerStack: v })} min={0} max={0.5} step={0.01} />
                  <NumberField label="Dmg/Tick" value={virus.baseDamagePerTick ?? 10} onChange={(v) => upRc("virus", { baseDamagePerTick: v })} min={1} max={200} step={1} />
                  <NumberField label="Dmg/Stack" value={virus.damagePerStack ?? 5} onChange={(v) => upRc("virus", { damagePerStack: v })} min={0} max={100} step={1} />
                  <NumberField label="Duration (s)" value={virus.duration ?? 3} onChange={(v) => upRc("virus", { duration: v })} min={0.5} max={20} step={0.5} />
                  <NumberField label="Max Stacks" value={virus.maxVirusStacks ?? 3} onChange={(v) => upRc("virus", { maxVirusStacks: v })} min={1} max={10} step={1} />
                </div>
              </Section>
              <Section title="Nuke (perm upgrade)">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <NumberField label="Nukes/Stack" value={nuke.nukesPerStack ?? 1} onChange={(v) => upRc("nuke", { nukesPerStack: v })} min={1} max={5} step={1} />
                  <NumberField label="Boss HP −%" value={(nuke.bossHPReduction ?? 0.25) * 100} onChange={(v) => upRc("nuke", { bossHPReduction: v / 100 })} min={1} max={100} step={1} />
                  <NumberField label="Cooldown (s)" value={nuke.cooldown ?? 30} onChange={(v) => upRc("nuke", { cooldown: v })} min={1} max={120} step={1} />
                </div>
              </Section>
              <Section title="Perm Shield (perm upgrade)">
                <div className="grid grid-cols-2 gap-4">
                  <NumberField label="Duration (s)" value={shield.duration ?? 10} onChange={(v) => upRc("shield", { duration: v })} min={1} max={60} step={1} />
                  <NumberField label="Cooldown (s)" value={shield.cooldown ?? 30} onChange={(v) => upRc("shield", { cooldown: v })} min={1} max={120} step={1} />
                </div>
              </Section>
              <Section title="Other Perm Upgrades">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <NumberField label="Speed/Stack" value={speed.speedPerStack ?? 0.01} onChange={(v) => upRc("speed", { speedPerStack: v })} min={0} max={0.5} step={0.005} />
                  <NumberField label="Strength/Stack" value={strength.damagePerStack ?? 0.02} onChange={(v) => upRc("strength", { damagePerStack: v })} min={0} max={0.5} step={0.005} />
                  <NumberField label="Projectiles/Stack" value={proj.projectilesPerStack ?? 1} onChange={(v) => upRc("projectile", { projectilesPerStack: v })} min={1} max={10} step={1} />
                  <NumberField label="Luck/Stack" value={luck.dropChancePerStack ?? 0.01} onChange={(v) => upRc("luck", { dropChancePerStack: v })} min={0} max={0.5} step={0.005} />
                  <NumberField label="Extra Life Hearts/Stack" value={extraLife.heartsPerStack ?? 1} onChange={(v) => upRc("extraLife", { heartsPerStack: v })} min={1} max={5} step={1} />
                </div>
              </Section>
            </>);
          })()}

          {/* Permanent Power-Up Toggles */}
          <Section title="Permanent Power-Ups (enable/disable)">
            <p className="text-xs text-neutral-500 mb-3">
              Disable individual permanent upgrades to stop them appearing on the selection screen.
              Useful for testing specific power-ups in isolation.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: "bomb",       label: "Bomb" },
                { id: "lightning",  label: "Lightning" },
                { id: "connect",    label: "Connect Beam" },
                { id: "extraLife",  label: "Extra Life" },
                { id: "frenzy",     label: "Frenzy" },
                { id: "health",     label: "Health (Slices)" },
                { id: "luck",       label: "Luck" },
                { id: "machineGun", label: "Machine Gun" },
                { id: "nuke",       label: "Nuke" },
                { id: "orbital",    label: "Orbital Orbs" },
                { id: "projectile", label: "Extra Projectile" },
                { id: "rapidFire",  label: "Rapid Fire" },
                { id: "seeker",     label: "Seeker Missile" },
                { id: "shield",     label: "Perm Shield" },
                { id: "speed",      label: "Speed" },
                { id: "strength",   label: "Strength" },
                { id: "virus",      label: "Virus" },
              ].map(({ id, label }) => {
                const disabled = settings.disabledPowerUps ?? [];
                const isEnabled = !disabled.includes(id);
                return (
                  <Toggle
                    key={id}
                    label={label}
                    checked={isEnabled}
                    onChange={(v) => {
                      const current = settings.disabledPowerUps ?? [];
                      const next = v
                        ? current.filter((x) => x !== id)
                        : [...current.filter((x) => x !== id), id];
                      updateField("disabledPowerUps", next);
                    }}
                  />
                );
              })}
            </div>
          </Section>

          {/* Boss Settings */}
          <Section title="Boss Settings">
            <div className="flex items-center gap-4 mb-3">
              <Toggle label="Enabled" checked={settings.boss.enabled} onChange={(v) => updateField("boss.enabled", v)} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <NumberField label="Interval (waves)" value={settings.boss.interval} onChange={(v) => updateField("boss.interval", v)} min={1} max={100} step={1} />
              <NumberField label="Base Health" value={settings.boss.baseHealth} onChange={(v) => updateField("boss.baseHealth", v)} min={100} max={10000} step={100} />
              <NumberField label="Health Increase" value={settings.boss.healthIncrease} onChange={(v) => updateField("boss.healthIncrease", v)} min={0} max={5000} step={100} />
              <NumberField label="Bullet Damage" value={settings.boss.bulletDamage} onChange={(v) => updateField("boss.bulletDamage", v)} min={1} max={500} step={1} />
              <NumberField label="Projectile Speed" value={settings.boss.projectileSpeed} onChange={(v) => updateField("boss.projectileSpeed", v)} min={10} max={300} step={1} />
              <NumberField label="Projectile Size" value={settings.boss.projectileSize} onChange={(v) => updateField("boss.projectileSize", v)} min={4} max={32} step={1} />
              <NumberField label="Fire Interval (sec)" value={settings.boss.fireInterval} onChange={(v) => updateField("boss.fireInterval", v)} min={0.5} max={10} step={0.5} />
              <NumberField label="Track Speed" value={settings.boss.trackSpeed} onChange={(v) => updateField("boss.trackSpeed", v)} min={5} max={200} step={5} />
              <NumberField label="Boss Width" value={settings.boss.width} onChange={(v) => updateField("boss.width", v)} min={10} max={120} step={1} />
              <NumberField label="Boss Height" value={settings.boss.height} onChange={(v) => updateField("boss.height", v)} min={10} max={120} step={1} />
              <NumberField label="Score Reward" value={settings.boss.scoreReward} onChange={(v) => updateField("boss.scoreReward", v)} min={0} max={5000} step={50} />
            </div>
            <p className="text-xs text-neutral-500 mt-2">Boss appears every N waves. HP = Base + (BossNumber - 1) × HealthIncrease.</p>
          </Section>

          {/* Boss HP Per Wave Group */}
          <Section title="Boss HP Per Wave Group">
            <p className="text-xs text-neutral-500 mb-3">
              Set a custom HP for each boss encounter. Boss 1 = waves 1–10, Boss 2 = waves 11–20, etc.
              Leave the array short and later bosses fall back to the formula above. Add entries with the button below.
            </p>
            <div className="space-y-2">
              {(settings.bossHealthPerWaveGroup ?? []).map((hp, idx) => {
                const waveFrom = idx * (settings.boss.interval ?? 10) + 1;
                const waveTo = (idx + 1) * (settings.boss.interval ?? 10);
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400 w-36 shrink-0">
                      Boss {idx + 1} (Wave {waveFrom}–{waveTo})
                    </span>
                    <input
                      type="number"
                      value={hp}
                      min={1}
                      step={100}
                      onChange={(e) => {
                        const next = [...(settings.bossHealthPerWaveGroup ?? [])];
                        next[idx] = parseFloat(e.target.value) || 0;
                        setSettings((prev) => prev ? { ...prev, bossHealthPerWaveGroup: next } : prev);
                      }}
                      className="w-32 rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
                    />
                    <button
                      onClick={() => {
                        const next = [...(settings.bossHealthPerWaveGroup ?? [])];
                        next.splice(idx, 1);
                        setSettings((prev) => prev ? { ...prev, bossHealthPerWaveGroup: next } : prev);
                      }}
                      className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Remove this boss entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => {
                const current = settings.bossHealthPerWaveGroup ?? [];
                const lastHp = current.length > 0 ? current[current.length - 1] : (settings.boss?.baseHealth ?? 500);
                const increment = settings.boss?.healthIncrease ?? 500;
                setSettings((prev) => prev ? { ...prev, bossHealthPerWaveGroup: [...current, lastHp + increment] } : prev);
              }}
              className="mt-3 flex items-center gap-1.5 rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-xs text-neutral-300 hover:bg-[#1e1e1e] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Boss Group
            </button>
          </Section>

          {/* Boss Position (per-platform) */}
          <Section title="Boss Position">
            <p className="text-xs text-neutral-500 mb-3">
              Where the boss spawns on {platform}. Drag the boss in the preview to move it.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="X" value={plat.boss.x} onChange={(v) => updateField(`${platform}.boss.x`, v)} min={0} max={240} step={1} />
              <NumberField label="Y" value={plat.boss.y} onChange={(v) => updateField(`${platform}.boss.y`, v)} min={0} max={300} step={1} />
            </div>
          </Section>

          {/* Boss Health Bar */}
          <Section title="Boss Health Bar">
            <div className="flex items-center gap-4 mb-3">
              <Toggle label="Visible" checked={plat.bossHealthBar.visible} onChange={(v) => updateField(`${platform}.bossHealthBar.visible`, v)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <NumberField label="X" value={plat.bossHealthBar.x} onChange={(v) => updateField(`${platform}.bossHealthBar.x`, v)} min={0} max={240} step={1} />
              <NumberField label="Y" value={plat.bossHealthBar.y} onChange={(v) => updateField(`${platform}.bossHealthBar.y`, v)} min={0} max={320} step={1} />
              <NumberField label="Size" value={plat.bossHealthBar.size ?? 6} onChange={(v) => updateField(`${platform}.bossHealthBar.size`, v)} min={4} max={32} step={1} />
            </div>
          </Section>

          {/* SFX Volume Mixer */}
          <Section title="SFX Volume Mixer">
            <p className="text-xs text-neutral-500 mb-4">
              Set per-sound volume multipliers. 1.0 = unchanged, 0.5 = half, 2.0 = double.
              These are applied globally on top of the player&apos;s master SFX volume and cannot be adjusted by players.
              Click ▶ to preview each sound at its current level.
            </p>
            <div className="space-y-3">
              {([
                { key: "shoot",         label: "Shoot",          type: "procedural" },
                { key: "enemyHit",      label: "Enemy Hit",      type: "procedural" },
                { key: "playerHit",     label: "Player Hit",     type: "procedural" },
                { key: "gameOver",      label: "Game Over",      type: "procedural" },
                { key: "levelComplete", label: "Level Complete", type: "procedural" },
                { key: "bomb",          label: "Bomb",           type: "file", url: "/audio/bomb.mp3" },
                { key: "lightning",     label: "Lightning",      type: "file", url: "/audio/lightning.mp3" },
                { key: "powerup",       label: "Power-Up",       type: "file", url: "/audio/powerup.mp3" },
                { key: "connect",       label: "Connect",        type: "file", url: "/audio/connect.mp3" },
                { key: "shield",        label: "Shield",         type: "file", url: "/audio/shield.mp3" },
              ] as { key: string; label: string; type: "procedural" | "file"; url?: string }[]).map(({ key, label, type, url }) => {
                const vol = (settings.sfxVolumes ?? {})[key] ?? 1;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400 w-28 shrink-0">{label}</span>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.05}
                      value={vol}
                      onChange={(e) => {
                        const next = { ...(settings.sfxVolumes ?? {}), [key]: parseFloat(e.target.value) };
                        setSettings((prev) => prev ? { ...prev, sfxVolumes: next } : prev);
                      }}
                      className="flex-1 accent-[#00f0ff]"
                    />
                    <span className="text-xs font-mono text-neutral-300 w-10 text-right">{vol.toFixed(2)}×</span>
                    <button
                      title={`Preview ${label}`}
                      onClick={() => {
                        // Resume AudioContext on user gesture so the preview actually plays
                        unlockAudio();
                        if (type === "file" && url) {
                          playFile(url);
                        } else {
                          play(key as Parameters<typeof play>[0]);
                        }
                      }}
                      className="flex items-center gap-1 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] px-2 py-1 text-xs text-neutral-300 transition-colors"
                    >
                      <Volume2 className="w-3 h-3" /> ▶
                    </button>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Game Copy -->
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

          {/* Player Hitbox — drawn visually in the editor preview */}
          <Section title="Player Hitbox">
            <p className="text-xs text-neutral-500 mb-2">
              Draw a custom polygon hitbox directly in the preview above. Click <strong className="text-white/70">✏ Edit Hitbox</strong> below the preview to enter drawing mode, then click to add points and drag them to shape the hitbox around the guitar sprite. Right-click a point to remove it.
            </p>
            <p className="text-xs text-neutral-500">
              Point count: <span className="text-white/70 font-mono">{settings.playerHitbox?.points?.length ?? 0}</span>
              {(settings.playerHitbox?.points?.length ?? 0) < 3 && (
                <span className="text-yellow-400 ml-2">⚠ Need ≥ 3 points for polygon collision — rectangle fallback is active</span>
              )}
            </p>
          </Section>

          {/* High Scores */}
          <Section title="High Scores">
            <div className="flex flex-col gap-4">
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
              <div className="flex items-center justify-between border-t border-[#1e1e1e] pt-4">
                <div>
                  <p className="text-sm text-neutral-300">
                    Global leaderboard
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Delete all submitted scores or edit individual entries below.
                  </p>
                </div>
                <button
                  onClick={handleResetLeaderboard}
                  disabled={resettingBoard}
                  className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <Trophy className="w-4 h-4" />
                  {resettingBoard ? "Resetting..." : "Reset Scoreboard"}
                </button>
              </div>

              {/* Leaderboard table */}
              <div className="mt-2">
                {leaderboardLoading ? (
                  <p className="text-xs text-neutral-500">Loading scores...</p>
                ) : leaderboard.length === 0 ? (
                  <p className="text-xs text-neutral-500">No scores yet.</p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-2 text-sm">
                        {editingScore?.id === entry.id ? (
                          <>
                            <input
                              type="text"
                              value={editingScore.name}
                              onChange={(e) => setEditingScore({ ...editingScore, name: e.target.value })}
                              className="w-24 rounded border border-[#1e1e1e] bg-[#0a0a0a] px-2 py-1 text-white text-xs"
                              maxLength={20}
                            />
                            <input
                              type="number"
                              value={editingScore.score}
                              onChange={(e) => setEditingScore({ ...editingScore, score: parseInt(e.target.value) || 0 })}
                              className="w-20 rounded border border-[#1e1e1e] bg-[#0a0a0a] px-2 py-1 text-white text-xs"
                            />
                            <input
                              type="number"
                              value={editingScore.wave}
                              onChange={(e) => setEditingScore({ ...editingScore, wave: parseInt(e.target.value) || 1 })}
                              className="w-14 rounded border border-[#1e1e1e] bg-[#0a0a0a] px-2 py-1 text-white text-xs"
                            />
                            <button
                              onClick={handleUpdateScore}
                              className="px-2 py-1 rounded bg-[#00f0ff] text-black text-xs font-bold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingScore(null)}
                              className="px-2 py-1 rounded bg-[#1e1e1e] text-neutral-300 text-xs"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-[#fcee0a] font-mono w-24 truncate">{entry.name}</span>
                            <span className="text-white font-mono w-20">{entry.score.toLocaleString()}</span>
                            <span className="text-neutral-400 text-xs w-14">W{entry.wave}</span>
                            <button
                              onClick={() => setEditingScore({ id: entry.id, name: entry.name, score: entry.score, wave: entry.wave })}
                              className="ml-auto px-2 py-1 rounded bg-[#1e1e1e] text-neutral-300 text-xs hover:bg-[#2a2a2a]"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteScore(entry.id)}
                              className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>
        </div>

        {/* Right: Live Preview */}
        <div className={platform === "desktop" ? "flex-1 min-w-0" : "w-auto shrink-0"}>
          <div className="sticky top-6 rounded-xl border border-[#1e1e1e] bg-[#141414] p-5 space-y-3">
            {/* Header row with zoom controls */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">Live Preview</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Drag dashed boxes to reposition. Pink = enemies (not draggable).
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setPreviewZoom((z) => Math.max(0.25, parseFloat((z - 0.25).toFixed(2))))}
                  className="p-1.5 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-neutral-300 transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-neutral-400 w-10 text-center">
                  {Math.round(previewZoom * 100)}%
                </span>
                <button
                  onClick={() => setPreviewZoom((z) => Math.min(4, parseFloat((z + 0.25).toFixed(2))))}
                  className="p-1.5 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-neutral-300 transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewZoom(1)}
                  className="ml-1 px-2 py-1 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-neutral-400 text-xs transition-colors"
                  title="Reset zoom"
                >
                  Reset
                </button>
              </div>
            </div>
            {/* Scrollable preview container */}
            <div
              className="overflow-auto rounded-xl"
              style={{ maxHeight: "90vh" }}
              onWheel={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  setPreviewZoom((z) =>
                    Math.min(4, Math.max(0.25, parseFloat((z + (e.deltaY < 0 ? 0.1 : -0.1)).toFixed(2))))
                  );
                }
              }}
            >
              <GameEditorPreview
                settings={plat}
                playerSprite={settings.playerSprite}
                bossSettings={settings.boss}
                platform={platform}
                zoom={previewZoom}
                hitboxPoints={settings.playerHitbox?.points}
                bulletSpawnOffsetX={settings.bulletSpawnOffsetX}
                bulletSpawnOffsetY={settings.bulletSpawnOffsetY}
                onChange={updatePlatform}
                onBossChange={(next) => setSettings((prev) => prev ? { ...prev, boss: next } : prev)}
                onHitboxChange={(points) => setSettings((prev) => prev ? { ...prev, playerHitbox: { ...(prev.playerHitbox ?? {}), points } } : prev)}
                onBulletSpawnChange={(ox, oy) => setSettings((prev) => prev ? { ...prev, bulletSpawnOffsetX: ox, bulletSpawnOffsetY: oy } : prev)}
              />
            </div>
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
