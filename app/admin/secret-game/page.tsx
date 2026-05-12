"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Gamepad2, RotateCcw, Play, Smartphone, Monitor, Trophy } from "lucide-react";
import { GameEditorPreview } from "@/components/secret-game/game-editor-preview";
import { updateSecretGameSettings, resetLeaderboard, getLeaderboard, deleteScore, updateScore } from "@/lib/actions";
import { useRouter } from "next/navigation";
import type { SecretGameSettings, GamePlatformSettings } from "@/lib/data";

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
  },
  bossHealthBar: { visible: true, x: 90, y: 4, size: 6 },
  boss: { x: 100, y: 20 },
};

export default function SecretGameAdminPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SecretGameSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [platform, setPlatform] = useState<"desktop" | "mobile">("desktop");
  const [resettingBoard, setResettingBoard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ id: string; name: string; score: number; wave: number; created_at: string }[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [editingScore, setEditingScore] = useState<{ id: string; name: string; score: number; wave: number } | null>(null);

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
          powerUpSpawnChance: sg.powerUpSpawnChance ?? 0.12,
          bossProjectileDropRate: sg.bossProjectileDropRate ?? 0.15,
          powerUpSize: sg.powerUpSize ?? 8,
          powerUpDurations: sg.powerUpDurations ?? { rapid: 5, wideShot: 4, invincible: 4 },
          enemyBaseHp: sg.enemyBaseHp ?? 1,
          enemyHpPerWave: sg.enemyHpPerWave ?? 0,
          impacts: sg.impacts ?? { playerBullet: { w: 28, h: 28 }, enemyBullet: { w: 20, h: 20 } },
          powerUpDropRates: sg.powerUpDropRates ?? { rapid: 1, shield: 1, wideshot: 1, extralife: 1, invincible: 1 },
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
              <NumberField label="Projectile Size" value={plat.enemy.projectileSize} onChange={(v) => updateField(`${platform}.enemy.projectileSize`, v)} min={4} max={32} step={1} />
              <NumberField label="Columns" value={plat.enemy.columns} onChange={(v) => updateField(`${platform}.enemy.columns`, v)} min={1} max={12} step={1} />
              <NumberField label="Rows" value={plat.enemy.rows} onChange={(v) => updateField(`${platform}.enemy.rows`, v)} min={1} max={8} step={1} />
              <NumberField label="Start Y" value={plat.enemy.startY} onChange={(v) => updateField(`${platform}.enemy.startY`, v)} min={3} max={300} step={1} />
              <NumberField label="Offset X" value={plat.enemy.offsetX} onChange={(v) => updateField(`${platform}.enemy.offsetX`, v)} min={-120} max={120} step={1} />
              <NumberField label="Padding X" value={plat.enemy.paddingX} onChange={(v) => updateField(`${platform}.enemy.paddingX`, v)} min={0} max={50} step={1} />
              <NumberField label="Padding Y" value={plat.enemy.paddingY} onChange={(v) => updateField(`${platform}.enemy.paddingY`, v)} min={0} max={50} step={1} />
              <NumberField label="Width" value={plat.enemy.width} onChange={(v) => updateField(`${platform}.enemy.width`, v)} min={8} max={64} step={1} />
              <NumberField label="Height" value={plat.enemy.height} onChange={(v) => updateField(`${platform}.enemy.height`, v)} min={8} max={64} step={1} />
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
            <p className="text-xs text-neutral-500 mb-3">Size of the GIF explosion when player bullets land (player) or enemy bullets hit the player (enemy).</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Player Hit W" value={settings.impacts?.playerBullet?.w ?? 28} onChange={(v) => updateField("impacts.playerBullet.w", v)} min={4} max={200} step={1} />
              <NumberField label="Player Hit H" value={settings.impacts?.playerBullet?.h ?? 28} onChange={(v) => updateField("impacts.playerBullet.h", v)} min={4} max={200} step={1} />
              <NumberField label="Enemy Hit W" value={settings.impacts?.enemyBullet?.w ?? 20} onChange={(v) => updateField("impacts.enemyBullet.w", v)} min={4} max={200} step={1} />
              <NumberField label="Enemy Hit H" value={settings.impacts?.enemyBullet?.h ?? 20} onChange={(v) => updateField("impacts.enemyBullet.h", v)} min={4} max={200} step={1} />
            </div>
          </Section>

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
                { id: "fastReload", label: "Fast Reload" },
                { id: "frenzy",     label: "Frenzy" },
                { id: "health",     label: "Health (Slices)" },
                { id: "luck",       label: "Luck" },
                { id: "machineGun", label: "Machine Gun" },
                { id: "nuke",       label: "Nuke" },
                { id: "projectile", label: "Extra Projectile" },
                { id: "rapidFire",  label: "Rapid Fire" },
                { id: "seeker",     label: "Seeker" },
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
        <div className="lg:w-[520px] shrink-0">
          <div className="sticky top-6 rounded-xl border border-[#1e1e1e] bg-[#141414] p-5 space-y-4">
            <h3 className="font-semibold text-white">Live Preview</h3>
            <p className="text-xs text-neutral-500">
              Drag the dashed boxes to reposition elements. Pink = enemies (not draggable).
            </p>
            <GameEditorPreview
              settings={plat}
              playerSprite={settings.playerSprite}
              bossSettings={settings.boss}
              platform={platform}
              onChange={updatePlatform}
              onBossChange={(next) => setSettings((prev) => prev ? { ...prev, boss: next } : prev)}
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
