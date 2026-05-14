"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Save, Gamepad2, RotateCcw, Play, Smartphone, Monitor, Trophy, ZoomIn, ZoomOut, Plus, Trash2, Volume2,
  Settings, LayoutGrid, Swords, Skull, User, Zap, Sparkles, Palette, Music, BarChart3,
} from "lucide-react";
import { GameEditorPreview } from "@/components/secret-game/game-editor-preview";
import { updateSecretGameSettings, resetLeaderboard, getLeaderboard, deleteScore, updateScore } from "@/lib/actions";
import { useRouter } from "next/navigation";
import type { SecretGameSettings, GamePlatformSettings, SpawnPoint } from "@/lib/data";
import { useAudioSfx, unlockAudio } from "@/components/secret-game/use-audio-sfx";
import { POWER_UP_REGISTRY } from "@/components/secret-game/power-up-registry";

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
  spawnPoints: [
    { x: 40, y: 10, enabled: true },
    { x: 120, y: 10, enabled: true },
    { x: 200, y: 10, enabled: true },
  ] as [SpawnPoint, SpawnPoint, SpawnPoint],
};

const TABS = [
  { id: "general",     label: "General",     icon: Settings },
  { id: "layout",      label: "Layout",      icon: LayoutGrid },
  { id: "enemy",       label: "Enemy",       icon: Swords },
  { id: "boss",        label: "Boss",        icon: Skull },
  { id: "player",      label: "Player",      icon: User },
  { id: "powerups",    label: "Power-ups",   icon: Zap },
  { id: "roguelike",   label: "Roguelike",   icon: Sparkles },
  { id: "visuals",     label: "Visuals",     icon: Palette },
  { id: "audio",       label: "Audio",       icon: Music },
  { id: "leaderboard", label: "Leaderboard", icon: BarChart3 },
] as const;

type TabId = (typeof TABS)[number]["id"];

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
  const [activeTab, setActiveTab] = useState<TabId>("layout");
  const fullDataRef = useRef<Record<string, unknown> | null>(null);
  const { play, playFile } = useAudioSfx();

  useEffect(() => {
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((data) => {
        fullDataRef.current = data;
        const sg = data.secretGame || {};
        const merged: SecretGameSettings = {
          enabled: sg.enabled ?? true,
          title: sg.title ?? "HERO INVADERS",
          instructions: sg.instructions ?? "Defend the stage from the invasion!",
          playerSprite: sg.playerSprite ?? { offsetX: -2, offsetY: -12, width: 14, height: 42 },
          powerUpSpawnChance: sg.powerUpSpawnChance ?? 0.12,
          bossProjectileDropRate: sg.bossProjectileDropRate ?? 0.15,
          powerUpSize: sg.powerUpSize ?? 8,
          powerUpDurations: sg.powerUpDurations ?? { rapid: 5, wideShot: 4, projectile: 4, invincible: 4 },
          enemyBaseHp: sg.enemyBaseHp ?? 1,
          enemyHpPerWave: sg.enemyHpPerWave ?? 0,
          enemyCollisionDamage: sg.enemyCollisionDamage ?? 1,
          enemyCollisionDamagePerWave: sg.enemyCollisionDamagePerWave ?? 0,
          enemyProjectileDamage: sg.enemyProjectileDamage ?? 1,
          enemyProjectileDamagePerWave: sg.enemyProjectileDamagePerWave ?? 0,
          enemyProjectileSpeedPerWave: sg.enemyProjectileSpeedPerWave ?? 0,
          impacts: sg.impacts ?? { playerBullet: { w: 28, h: 28 }, enemyBullet: { w: 20, h: 20 } },
          powerUpDropRates: sg.powerUpDropRates ?? { rapid: 1, wideshot: 1, projectile: 1, extralife: 1, invincible: 1 },
          waveRewardEnabled: sg.waveRewardEnabled ?? true,
          enemyChoiceDropChance: sg.enemyChoiceDropChance ?? 0.05,
          disabledPowerUps: sg.disabledPowerUps ?? [],
          powerUpMaxStacks: sg.powerUpMaxStacks ?? {},
          boss: sg.boss ?? {
            enabled: true, interval: 10, baseHealth: 500, healthIncrease: 500,
            bulletDamage: 20, projectileSpeed: 80, projectileSize: 10, projectileCount: 1,
            fireInterval: 3, trackSpeed: 30, width: 40, height: 30, scoreReward: 500,
          },
          roguelikeConfig: sg.roguelikeConfig ?? {},
          permShield: sg.permShield ?? { offsetX: 0, offsetY: 0, radius: 20, size: 1 },
          playerHitbox: sg.playerHitbox ?? {},
          bulletSpawnOffsetX: sg.bulletSpawnOffsetX,
          bulletSpawnOffsetY: sg.bulletSpawnOffsetY,
          mouseFollowOffsetX: sg.mouseFollowOffsetX,
          mouseFollowOffsetY: sg.mouseFollowOffsetY,
          bossHealthPerWaveGroup: sg.bossHealthPerWaveGroup ?? [],
          bossDifficultyPerWaveGroup: sg.bossDifficultyPerWaveGroup ?? [],
          enemyDifficultyPerWaveGroup: sg.enemyDifficultyPerWaveGroup ?? [],
          waveConfigs: sg.waveConfigs ?? [{ spawnCount: 8, spawnRate: 1, spawnDelay: 1 }, { spawnCount: 12, spawnRate: 1.2, spawnDelay: 0.5 }, { spawnCount: 16, spawnRate: 1.4, spawnDelay: 0.5 }],
          sfxVolumes: sg.sfxVolumes ?? {},
          damageNumbers: sg.damageNumbers ?? {},
          desktop: { ...DEFAULT_PLATFORM, ...sg.desktop, enemy: { ...DEFAULT_PLATFORM.enemy, ...(sg.desktop?.enemy ?? {}) } },
          mobile:  { ...DEFAULT_PLATFORM, ...sg.mobile,  enemy: { ...DEFAULT_PLATFORM.enemy, ...(sg.mobile?.enemy  ?? {}) } },
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
      .then((data) => { setLeaderboard(data); setLeaderboardLoading(false); })
      .catch(() => setLeaderboardLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (!settings) return;
    setSaving(true); setSaveError(null); setSaveOk(false);
    try {
      await updateSecretGameSettings(settings);
      try {
        const freshPayload = { ...(fullDataRef.current ?? {}), secretGame: settings };
        await fetch("/api/admin/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(freshPayload) });
      } catch {}
      setSaveOk(true); setTimeout(() => setSaveOk(false), 3000); router.refresh();
    } catch (err) { setSaveError(err instanceof Error ? err.message : String(err)); }
    finally { setSaving(false); }
  }, [settings, router]);

  const handleResetHighScore = useCallback(() => {
    try { localStorage.removeItem("abch-guitar-invaders-highscore"); setHighScore(0); } catch {}
  }, []);

  const handleResetLeaderboard = useCallback(async () => {
    if (!confirm("Are you sure you want to delete ALL leaderboard scores? This cannot be undone.")) return;
    setResettingBoard(true);
    try { await resetLeaderboard(); setLeaderboard([]); alert("Leaderboard reset successfully."); }
    catch { alert("Failed to reset leaderboard."); }
    finally { setResettingBoard(false); }
  }, []);

  const handleDeleteScore = useCallback(async (id: string) => {
    if (!confirm("Delete this score?")) return;
    try { await deleteScore(id); setLeaderboard((prev) => prev.filter((s) => s.id !== id)); }
    catch { alert("Failed to delete score."); }
  }, []);

  const handleUpdateScore = useCallback(async () => {
    if (!editingScore) return;
    try {
      await updateScore(editingScore.id, editingScore.name, editingScore.score, editingScore.wave);
      setLeaderboard((prev) => prev.map((s) => s.id === editingScore.id ? { ...s, name: editingScore.name, score: editingScore.score, wave: editingScore.wave } : s).sort((a, b) => b.score - a.score));
      setEditingScore(null);
    } catch { alert("Failed to update score."); }
  }, [editingScore]);

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

  const updatePlatform = useCallback((nextPlatform: GamePlatformSettings) => {
    setSettings((prev) => prev ? { ...prev, [platform]: nextPlatform } : prev);
  }, [platform]);

  const handlePreview = useCallback(() => window.open("/secret-game", "_blank"), []);

  if (loading || !settings) {
    return <div className="flex items-center justify-center h-64 text-neutral-500">Loading...</div>;
  }

  const plat = settings[platform];

  // ─── Roguelike config helpers ───────────────────────────────────────────
  const rc = settings.roguelikeConfig ?? {};
  const upRc = (key: string, val: object) =>
    updateField("roguelikeConfig", { ...settings.roguelikeConfig, [key]: { ...(settings.roguelikeConfig as Record<string, object> ?? {})[key], ...val } });

  // ─── Tab content renderers ──────────────────────────────────────────────

  const GeneralTab = () => (
    <div className="space-y-4">
      <Section title="Game Status">
        <Toggle label="Enable Secret Game" checked={settings.enabled} onChange={(v) => updateField("enabled", v)} />
      </Section>
      <Section title="Game Copy">
        <div className="space-y-4">
          <Field label="Title" value={settings.title} onChange={(v) => updateField("title", v)} />
          <TextArea label="Instructions" value={settings.instructions} onChange={(v) => updateField("instructions", v)} rows={2} />
        </div>
      </Section>
    </div>
  );

  const LayoutTab = () => (
    <div className="space-y-4">
      {/* Platform switch */}
      <div className="flex gap-2">
        <button onClick={() => setPlatform("desktop")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${platform === "desktop" ? "bg-[#00f0ff] text-black" : "bg-[#1e1e1e] text-neutral-300 hover:bg-[#2a2a2a]"}`}>
          <Monitor className="w-4 h-4" /> Desktop
        </button>
        <button onClick={() => setPlatform("mobile")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${platform === "mobile" ? "bg-[#00f0ff] text-black" : "bg-[#1e1e1e] text-neutral-300 hover:bg-[#2a2a2a]"}`}>
          <Smartphone className="w-4 h-4" /> Mobile
        </button>
      </div>

      <Section title={`Player Position (${platform})`}>
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="X" value={plat.player.x} onChange={(v) => updateField(`${platform}.player.x`, v)} min={0} max={240} step={1} />
          <NumberField label="Y" value={plat.player.y} onChange={(v) => updateField(`${platform}.player.y`, v)} min={0} max={320} step={1} />
        </div>
        <p className="text-xs text-neutral-500 mt-2">Tip: Drag the player in the preview to move it.</p>
      </Section>

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
        <div className="mt-3">
          <NumberField label="Sprite Scale" value={(plat.enemy as { spriteScale?: number }).spriteScale ?? 1} onChange={(v) => updateField(`${platform}.enemy.spriteScale`, v)} min={0.1} max={5} step={0.05} />
          <p className="text-xs text-neutral-500">Scales the sprite visually only — does not affect grid spacing or collision.</p>
        </div>
      </Section>

      <Section title={`Enemy Hitbox (${platform})`}>
        <p className="text-xs text-neutral-500 mb-3">Collision box for player-bullet vs enemy detection. Offset is from the top-left of the grid cell. Defaults to the full cell size.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <NumberField label="Offset X" value={(plat.enemy as {hitboxOffsetX?:number}).hitboxOffsetX ?? 0} onChange={(v) => updateField(`${platform}.enemy.hitboxOffsetX`, v)} min={-100} max={100} step={1} />
          <NumberField label="Offset Y" value={(plat.enemy as {hitboxOffsetY?:number}).hitboxOffsetY ?? 0} onChange={(v) => updateField(`${platform}.enemy.hitboxOffsetY`, v)} min={-100} max={100} step={1} />
          <NumberField label="Width" value={(plat.enemy as {hitboxWidth?:number}).hitboxWidth ?? plat.enemy.width} onChange={(v) => updateField(`${platform}.enemy.hitboxWidth`, v)} min={1} max={200} step={1} />
          <NumberField label="Height" value={(plat.enemy as {hitboxHeight?:number}).hitboxHeight ?? plat.enemy.height} onChange={(v) => updateField(`${platform}.enemy.hitboxHeight`, v)} min={1} max={200} step={1} />
        </div>
      </Section>

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

      <Section title="HUD Controls (Pause / Mute / Fullscreen)">
        <p className="text-xs text-neutral-500 mb-3">Position of the control button row in game-logical units (240 × 320). Buttons flow left-to-right from this point.</p>
        <div className="grid grid-cols-3 gap-4">
          <NumberField label="X" value={plat.controls?.x ?? 159} onChange={(v) => updateField(`${platform}.controls.x`, v)} min={0} max={240} step={1} />
          <NumberField label="Y" value={plat.controls?.y ?? 292} onChange={(v) => updateField(`${platform}.controls.y`, v)} min={0} max={320} step={1} />
          <NumberField label="Button Size" value={plat.controls?.size ?? 24} onChange={(v) => updateField(`${platform}.controls.size`, v)} min={12} max={48} step={1} />
        </div>
      </Section>

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

      <Section title={`Boss Position (${platform})`}>
        <p className="text-xs text-neutral-500 mb-3">Where the boss spawns. Drag the boss in the preview to move it.</p>
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="X" value={plat.boss.x} onChange={(v) => updateField(`${platform}.boss.x`, v)} min={0} max={240} step={1} />
          <NumberField label="Y" value={plat.boss.y} onChange={(v) => updateField(`${platform}.boss.y`, v)} min={0} max={300} step={1} />
        </div>
      </Section>

      <Section title={`Enemy Spawn Points (${platform})`}>
        <p className="text-xs text-neutral-500 mb-3">Three spawn points where horde enemies appear. Drag them in the preview to reposition.</p>
        {plat.spawnPoints.map((sp, idx) => (
          <div key={idx} className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-300">Spawn Point {idx + 1}</span>
              <Toggle label="Enabled" checked={sp.enabled} onChange={(v) => updateField(`${platform}.spawnPoints.${idx}.enabled`, v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="X" value={sp.x} onChange={(v) => updateField(`${platform}.spawnPoints.${idx}.x`, v)} min={0} max={240} step={1} />
              <NumberField label="Y" value={sp.y} onChange={(v) => updateField(`${platform}.spawnPoints.${idx}.y`, v)} min={0} max={320} step={1} />
            </div>
          </div>
        ))}
      </Section>

      <Section title="Shield Bubble (temp power-up)">
        <div className="grid grid-cols-3 gap-4">
          <NumberField label="Offset X" value={plat.shield.offsetX} onChange={(v) => updateField(`${platform}.shield.offsetX`, v)} step={1} />
          <NumberField label="Offset Y" value={plat.shield.offsetY} onChange={(v) => updateField(`${platform}.shield.offsetY`, v)} step={1} />
          <NumberField label="Radius" value={plat.shield.radius} onChange={(v) => updateField(`${platform}.shield.radius`, v)} min={1} max={100} step={1} />
        </div>
      </Section>

      <Section title="Permanent Shield Bubble (roguelike)">
        <p className="text-xs text-neutral-500 mb-3">The shield sprite that appears when the Perm Shield roguelike upgrade is active.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <NumberField label="Offset X" value={settings.permShield?.offsetX ?? 0} onChange={(v) => updateField("permShield.offsetX", v)} step={1} />
          <NumberField label="Offset Y" value={settings.permShield?.offsetY ?? 0} onChange={(v) => updateField("permShield.offsetY", v)} step={1} />
          <NumberField label="Radius" value={settings.permShield?.radius ?? 20} onChange={(v) => updateField("permShield.radius", v)} min={1} max={100} step={1} />
          <NumberField label="Size (scale)" value={settings.permShield?.size ?? 1} onChange={(v) => updateField("permShield.size", v)} min={0.1} max={5} step={0.1} />
        </div>
      </Section>
    </div>
  );

  const EnemyTab = () => (
    <div className="space-y-4">
      <Section title="Enemy Combat">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <NumberField label="Speed" value={plat.enemy.speed} onChange={(v) => updateField(`${platform}.enemy.speed`, v)} min={0} max={200} step={1} />
          <NumberField label="Fire Rate" value={plat.enemy.fireRate} onChange={(v) => updateField(`${platform}.enemy.fireRate`, v)} min={0} max={1} step={0.001} />
          <NumberField label="Projectile Speed" value={plat.enemy.projectileSpeed} onChange={(v) => updateField(`${platform}.enemy.projectileSpeed`, v)} min={0} max={300} step={1} />
          <NumberField label="Projectile Size" value={plat.enemy.projectileSize} onChange={(v) => updateField(`${platform}.enemy.projectileSize`, v)} min={1} max={200} step={1} />
        </div>
      </Section>

      <Section title="Projectile Sizes (Platform Override)">
        <p className="text-xs text-neutral-500 mb-3">Override projectile visual sizes for {platform}. Falls back to global defaults when left at 0.</p>
        {(() => {
          const ps = plat.projectileSizes ?? {};
          const upPs = (patch: Partial<NonNullable<typeof plat.projectileSizes>>) => updateField(`${platform}.projectileSizes`, { ...ps, ...patch });
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Boss Projectile" value={ps.boss ?? 0} onChange={(v) => upPs({ boss: v || undefined })} min={0} max={100} step={1} />
              <NumberField label="Player Bullet" value={ps.playerBullet ?? 0} onChange={(v) => upPs({ playerBullet: v || undefined })} min={0} max={30} step={1} />
              <NumberField label="Super Red" value={ps.superRed ?? 0} onChange={(v) => upPs({ superRed: v || undefined })} min={0} max={50} step={1} />
              <NumberField label="Super Purple" value={ps.superPurple ?? 0} onChange={(v) => upPs({ superPurple: v || undefined })} min={0} max={50} step={1} />
              <NumberField label="Super Gold" value={ps.superGold ?? 0} onChange={(v) => upPs({ superGold: v || undefined })} min={0} max={50} step={1} />
              <NumberField label="Seeker Missile" value={ps.seeker ?? 0} onChange={(v) => upPs({ seeker: v || undefined })} min={0} max={50} step={1} />
              <NumberField label="Orbital Orb" value={ps.orbital ?? 0} onChange={(v) => upPs({ orbital: v || undefined })} min={0} max={50} step={1} />
            </div>
          );
        })()}
      </Section>

      <Section title="Enemy HP Scaling">
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Base HP (Wave 1)" value={settings.enemyBaseHp ?? 1} onChange={(v) => updateField("enemyBaseHp", v)} min={1} max={50} step={1} />
          <NumberField label="Extra HP Per Wave" value={settings.enemyHpPerWave ?? 0} onChange={(v) => updateField("enemyHpPerWave", v)} min={0} max={20} step={1} />
        </div>
        <p className="text-xs text-neutral-500 mt-2">Enemy HP at wave N = Base HP + (N − 1) × Extra HP Per Wave. Set Extra to 0 for one-hit enemies throughout.</p>
      </Section>

      <Section title="Enemy Damage Scaling (Per Wave)">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <NumberField label="Collision Damage (Base)" value={settings.enemyCollisionDamage ?? 1} onChange={(v) => updateField("enemyCollisionDamage", v)} min={1} max={20} step={1} />
          <NumberField label="Collision Dmg Per Wave" value={settings.enemyCollisionDamagePerWave ?? 0} onChange={(v) => updateField("enemyCollisionDamagePerWave", v)} min={0} max={10} step={1} />
          <NumberField label="Projectile Damage (Base)" value={settings.enemyProjectileDamage ?? 1} onChange={(v) => updateField("enemyProjectileDamage", v)} min={1} max={20} step={1} />
          <NumberField label="Projectile Dmg Per Wave" value={settings.enemyProjectileDamagePerWave ?? 0} onChange={(v) => updateField("enemyProjectileDamagePerWave", v)} min={0} max={10} step={1} />
          <NumberField label="Projectile Speed Per Wave" value={settings.enemyProjectileSpeedPerWave ?? 0} onChange={(v) => updateField("enemyProjectileSpeedPerWave", v)} min={0} max={50} step={1} />
        </div>
        <p className="text-xs text-neutral-500 mt-2">Collision damage = Base + (Wave − 1) × Per Wave (slices removed on body contact). Projectile damage = same formula. Projectile speed increases by Per Wave each wave.</p>
      </Section>

      <Section title="Enemy Difficulty Per Wave Group">
        <p className="text-xs text-neutral-500 mb-3">Override all enemy stats for specific wave ranges. Group 1 = Waves 1–10, Group 2 = Waves 11–20, etc. When a group is set, it replaces the formula scaling for every wave in that range.</p>
        <div className="space-y-3">
          {(settings.enemyDifficultyPerWaveGroup ?? []).map((group, idx) => {
            const waveFrom = idx * 10 + 1;
            const waveTo = (idx + 1) * 10;
            const updateGroup = (patch: Partial<typeof group>) => {
              const next = [...(settings.enemyDifficultyPerWaveGroup ?? [])];
              next[idx] = { ...group, ...patch };
              setSettings((prev) => prev ? { ...prev, enemyDifficultyPerWaveGroup: next } : prev);
            };
            return (
              <div key={idx} className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-neutral-300">Group {idx + 1} (Wave {waveFrom}–{waveTo})</span>
                  <button onClick={() => {
                    const next = [...(settings.enemyDifficultyPerWaveGroup ?? [])];
                    next.splice(idx, 1);
                    setSettings((prev) => prev ? { ...prev, enemyDifficultyPerWaveGroup: next } : prev);
                  }} className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" title="Remove this group"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <NumberField label="HP" value={group.hp} onChange={(v) => updateGroup({ hp: v })} min={1} max={500} step={1} />
                  <NumberField label="Speed" value={group.speed} onChange={(v) => updateGroup({ speed: v })} min={0} max={200} step={1} />
                  <NumberField label="Fire Rate" value={group.fireRate} onChange={(v) => updateGroup({ fireRate: v })} min={0} max={1} step={0.001} />
                  <NumberField label="Projectile Speed" value={group.projectileSpeed} onChange={(v) => updateGroup({ projectileSpeed: v })} min={0} max={300} step={1} />
                  <NumberField label="Projectile Damage" value={group.projectileDamage} onChange={(v) => updateGroup({ projectileDamage: v })} min={1} max={50} step={1} />
                  <NumberField label="Collision Damage" value={group.collisionDamage} onChange={(v) => updateGroup({ collisionDamage: v })} min={1} max={50} step={1} />
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => {
          const current = settings.enemyDifficultyPerWaveGroup ?? [];
          const last = current.length > 0 ? current[current.length - 1] : null;
          const nextGroup = last ? { ...last } : {
            hp: (settings.enemyBaseHp ?? 1) + current.length * 10 * (settings.enemyHpPerWave ?? 0),
            speed: Math.min((plat.enemy.speed ?? 18) + current.length * 10 * 1.2, 90),
            fireRate: Math.min((plat.enemy.fireRate ?? 0.003) * (1 + current.length * 10 * 0.025), 0.012),
            projectileSpeed: (plat.enemy.projectileSpeed ?? 60) + current.length * 10 * (settings.enemyProjectileSpeedPerWave ?? 0),
            projectileDamage: Math.max(1, Math.round((settings.enemyProjectileDamage ?? 1) + current.length * 10 * (settings.enemyProjectileDamagePerWave ?? 0))),
            collisionDamage: Math.max(1, Math.round((settings.enemyCollisionDamage ?? 1) + current.length * 10 * (settings.enemyCollisionDamagePerWave ?? 0))),
          };
          setSettings((prev) => prev ? { ...prev, enemyDifficultyPerWaveGroup: [...current, nextGroup] } : prev);
        }} className="mt-3 flex items-center gap-1.5 rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-xs text-neutral-300 hover:bg-[#1e1e1e] transition-colors"><Plus className="w-3.5 h-3.5" /> Add Wave Group</button>
      </Section>

      <Section title="Wave Spawn Config (Per Wave)">
        <p className="text-xs text-neutral-500 mb-3">Configure how many enemies spawn, how fast they spawn, and the initial delay for each individual wave. If a wave has no config, it falls back to formula scaling.</p>
        <div className="space-y-3">
          {(settings.waveConfigs ?? []).map((wave, idx) => {
            const updateWave = (patch: Partial<typeof wave>) => {
              const next = [...(settings.waveConfigs ?? [])];
              next[idx] = { ...wave, ...patch };
              setSettings((prev) => prev ? { ...prev, waveConfigs: next } : prev);
            };
            return (
              <div key={idx} className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-neutral-300">Wave {idx + 1}</span>
                  <button onClick={() => {
                    const next = [...(settings.waveConfigs ?? [])];
                    next.splice(idx, 1);
                    setSettings((prev) => prev ? { ...prev, waveConfigs: next } : prev);
                  }} className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" title="Remove this wave config"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <NumberField label="Spawn Count" value={wave.spawnCount} onChange={(v) => updateWave({ spawnCount: v })} min={1} max={200} step={1} />
                  <NumberField label="Spawn Rate (per sec)" value={wave.spawnRate} onChange={(v) => updateWave({ spawnRate: v })} min={0.1} max={10} step={0.1} />
                  <NumberField label="Spawn Delay (sec)" value={wave.spawnDelay} onChange={(v) => updateWave({ spawnDelay: v })} min={0} max={30} step={0.5} />
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => {
          const current = settings.waveConfigs ?? [];
          const last = current.length > 0 ? current[current.length - 1] : null;
          const nextWave = last ? { ...last, spawnCount: last.spawnCount + 4 } : { spawnCount: 8, spawnRate: 1, spawnDelay: 1 };
          setSettings((prev) => prev ? { ...prev, waveConfigs: [...current, nextWave] } : prev);
        }} className="mt-3 flex items-center gap-1.5 rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-xs text-neutral-300 hover:bg-[#1e1e1e] transition-colors"><Plus className="w-3.5 h-3.5" /> Add Wave</button>
      </Section>
    </div>
  );

  const BossTab = () => (
    <div className="space-y-4">
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
          <NumberField label="Projectile Count" value={settings.boss.projectileCount} onChange={(v) => updateField("boss.projectileCount", v)} min={1} max={20} step={1} />
          <NumberField label="Fire Interval (sec)" value={settings.boss.fireInterval} onChange={(v) => updateField("boss.fireInterval", v)} min={0.5} max={10} step={0.5} />
          <NumberField label="Track Speed" value={settings.boss.trackSpeed} onChange={(v) => updateField("boss.trackSpeed", v)} min={5} max={200} step={5} />
          <NumberField label="Boss Width" value={settings.boss.width} onChange={(v) => updateField("boss.width", v)} min={10} max={120} step={1} />
          <NumberField label="Boss Height" value={settings.boss.height} onChange={(v) => updateField("boss.height", v)} min={10} max={120} step={1} />
          <NumberField label="Score Reward" value={settings.boss.scoreReward} onChange={(v) => updateField("boss.scoreReward", v)} min={0} max={5000} step={50} />
        </div>
        <p className="text-xs text-neutral-500 mt-2">Boss appears every N waves. HP = Base + (BossNumber - 1) × HealthIncrease.</p>
      </Section>

      <Section title="Boss Difficulty Per Wave Group">
        <p className="text-xs text-neutral-500 mb-3">Override all boss stats for each boss encounter. Boss 1 = waves 1–10, Boss 2 = waves 11–20, etc. When set, replaces the defaults and formula for that boss.</p>
        <div className="space-y-3">
          {(settings.bossDifficultyPerWaveGroup ?? []).map((group, idx) => {
            const waveFrom = idx * (settings.boss.interval ?? 10) + 1;
            const waveTo = (idx + 1) * (settings.boss.interval ?? 10);
            const updateGroup = (patch: Partial<typeof group>) => {
              const next = [...(settings.bossDifficultyPerWaveGroup ?? [])];
              next[idx] = { ...group, ...patch };
              setSettings((prev) => prev ? { ...prev, bossDifficultyPerWaveGroup: next } : prev);
            };
            return (
              <div key={idx} className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-neutral-300">Boss {idx + 1} (Wave {waveFrom}–{waveTo})</span>
                  <button onClick={() => {
                    const next = [...(settings.bossDifficultyPerWaveGroup ?? [])];
                    next.splice(idx, 1);
                    setSettings((prev) => prev ? { ...prev, bossDifficultyPerWaveGroup: next } : prev);
                  }} className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" title="Remove this boss entry"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <NumberField label="HP" value={group.hp} onChange={(v) => updateGroup({ hp: v })} min={1} max={50000} step={100} />
                  <NumberField label="Speed" value={group.speed} onChange={(v) => updateGroup({ speed: v })} min={0} max={300} step={5} />
                  <NumberField label="Fire Interval (sec)" value={group.fireInterval} onChange={(v) => updateGroup({ fireInterval: v })} min={0.1} max={10} step={0.1} />
                  <NumberField label="Projectile Speed" value={group.projectileSpeed} onChange={(v) => updateGroup({ projectileSpeed: v })} min={0} max={300} step={5} />
                  <NumberField label="Projectile Damage" value={group.projectileDamage} onChange={(v) => updateGroup({ projectileDamage: v })} min={1} max={50} step={1} />
                  <NumberField label="Collision Damage" value={group.collisionDamage} onChange={(v) => updateGroup({ collisionDamage: v })} min={1} max={50} step={1} />
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => {
          const current = settings.bossDifficultyPerWaveGroup ?? [];
          const last = current.length > 0 ? current[current.length - 1] : null;
          const nextGroup = last ? { ...last } : {
            hp: (settings.boss?.baseHealth ?? 500) + current.length * (settings.boss?.healthIncrease ?? 500),
            speed: settings.boss?.trackSpeed ?? 30,
            fireInterval: settings.boss?.fireInterval ?? 3,
            projectileSpeed: settings.boss?.projectileSpeed ?? 80,
            projectileDamage: settings.enemyProjectileDamage ?? 1,
            collisionDamage: settings.enemyCollisionDamage ?? 1,
          };
          setSettings((prev) => prev ? { ...prev, bossDifficultyPerWaveGroup: [...current, nextGroup] } : prev);
        }} className="mt-3 flex items-center gap-1.5 rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-xs text-neutral-300 hover:bg-[#1e1e1e] transition-colors"><Plus className="w-3.5 h-3.5" /> Add Boss Group</button>
      </Section>

      <Section title="Boss HP Per Wave Group (Legacy)">
        <p className="text-xs text-neutral-500 mb-3">Simple HP overrides per boss. Only used if the full "Boss Difficulty Per Wave Group" above is empty for that boss.</p>
        <div className="space-y-2">
          {(settings.bossHealthPerWaveGroup ?? []).map((hp, idx) => {
            const waveFrom = idx * (settings.boss.interval ?? 10) + 1;
            const waveTo = (idx + 1) * (settings.boss.interval ?? 10);
            return (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs text-neutral-400 w-36 shrink-0">Boss {idx + 1} (Wave {waveFrom}–{waveTo})</span>
                <input type="number" value={hp} min={1} step={100}
                  onChange={(e) => {
                    const next = [...(settings.bossHealthPerWaveGroup ?? [])];
                    next[idx] = parseFloat(e.target.value) || 0;
                    setSettings((prev) => prev ? { ...prev, bossHealthPerWaveGroup: next } : prev);
                  }}
                  className="w-32 rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
                />
                <button onClick={() => {
                  const next = [...(settings.bossHealthPerWaveGroup ?? [])]; next.splice(idx, 1);
                  setSettings((prev) => prev ? { ...prev, bossHealthPerWaveGroup: next } : prev);
                }} className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" title="Remove this boss entry"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            );
          })}
        </div>
        <button onClick={() => {
          const current = settings.bossHealthPerWaveGroup ?? [];
          const lastHp = current.length > 0 ? current[current.length - 1] : (settings.boss?.baseHealth ?? 500);
          const increment = settings.boss?.healthIncrease ?? 500;
          setSettings((prev) => prev ? { ...prev, bossHealthPerWaveGroup: [...current, lastHp + increment] } : prev);
        }} className="mt-3 flex items-center gap-1.5 rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-xs text-neutral-300 hover:bg-[#1e1e1e] transition-colors"><Plus className="w-3.5 h-3.5" /> Add Boss HP Override</button>
      </Section>

      {(() => {
        const sprites = rc.sprites ?? {};
        return (
          <Section title="Boss Sprite Scaling">
            <p className="text-xs text-neutral-500 mb-3">Scale the boss PNG sprite relative to its hitbox. Use offsets to re-centre after scaling.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Width Multiplier" value={sprites.bossWidthMult ?? 2.2} onChange={(v) => upRc("sprites", { bossWidthMult: v })} min={0.1} max={10} step={0.1} />
              <NumberField label="Height Multiplier" value={sprites.bossHeightMult ?? 2.2} onChange={(v) => upRc("sprites", { bossHeightMult: v })} min={0.1} max={10} step={0.1} />
              <NumberField label="Offset X" value={sprites.bossOffsetX ?? -28} onChange={(v) => upRc("sprites", { bossOffsetX: v })} min={-100} max={100} step={1} />
              <NumberField label="Offset Y" value={sprites.bossOffsetY ?? -35} onChange={(v) => upRc("sprites", { bossOffsetY: v })} min={-100} max={100} step={1} />
            </div>
          </Section>
        );
      })()}

      <Section title="Enemy Projectile Sheet Layout">
        <p className="text-xs text-neutral-500 mb-3">The underwear.png sprite sheet layout for enemy projectiles. Default is 4×4 = 16 random types.</p>
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Rows" value={rc.sprites?.underwearRows ?? 4} onChange={(v) => upRc("sprites", { underwearRows: v })} min={1} max={10} step={1} />
          <NumberField label="Columns" value={rc.sprites?.underwearCols ?? 4} onChange={(v) => upRc("sprites", { underwearCols: v })} min={1} max={10} step={1} />
        </div>
      </Section>
    </div>
  );

  const PlayerTab = () => (
    <div className="space-y-4">
      <Section title="Player Sprite Offset">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <NumberField label="Offset X" value={settings.playerSprite.offsetX} onChange={(v) => updateField("playerSprite.offsetX", v)} step={1} />
          <NumberField label="Offset Y" value={settings.playerSprite.offsetY} onChange={(v) => updateField("playerSprite.offsetY", v)} step={1} />
          <NumberField label="Width" value={settings.playerSprite.width} onChange={(v) => updateField("playerSprite.width", v)} min={1} max={100} step={1} />
          <NumberField label="Height" value={settings.playerSprite.height} onChange={(v) => updateField("playerSprite.height", v)} min={1} max={100} step={1} />
          <NumberField label="Cols" value={settings.playerSprite.cols ?? 12} onChange={(v) => updateField("playerSprite.cols", v)} min={1} max={60} step={1} />
        </div>
      </Section>

      <Section title="Player Hitbox">
        <p className="text-xs text-neutral-500 mb-2">Draw a custom polygon hitbox directly in the preview. Click <strong className="text-white/70">✏ Edit Hitbox</strong> below the preview to enter drawing mode, then click to add points and drag them to shape the hitbox around the guitar sprite. Right-click a point to remove it.</p>
        <p className="text-xs text-neutral-500">Point count: <span className="text-white/70 font-mono">{settings.playerHitbox?.points?.length ?? 0}</span>{(settings.playerHitbox?.points?.length ?? 0) < 3 && <span className="text-yellow-400 ml-2">⚠ Need ≥ 3 points for polygon collision — rectangle fallback is active</span>}</p>
      </Section>

      <Section title="Bullet Spawn Offset">
        <p className="text-xs text-neutral-500 mb-3">Where the player&apos;s bullets spawn, as an offset from playerX / playerY in game-logical units. Defaults to the centre of the sprite.</p>
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Offset X" value={settings.bulletSpawnOffsetX ?? 0} onChange={(v) => updateField("bulletSpawnOffsetX", v)} min={-50} max={50} step={1} />
          <NumberField label="Offset Y" value={settings.bulletSpawnOffsetY ?? 0} onChange={(v) => updateField("bulletSpawnOffsetY", v)} min={-50} max={50} step={1} />
        </div>
      </Section>

      <Section title="Mouse Follow Offset">
        <p className="text-xs text-neutral-500 mb-3">Where the mouse cursor sits relative to the player when using mouse/touch to move. Defaults to sprite centre. Use the Live Preview to drag the target dot.</p>
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Offset X" value={settings.mouseFollowOffsetX ?? 0} onChange={(v) => updateField("mouseFollowOffsetX", v)} min={-50} max={50} step={1} />
          <NumberField label="Offset Y" value={settings.mouseFollowOffsetY ?? 0} onChange={(v) => updateField("mouseFollowOffsetY", v)} min={-50} max={50} step={1} />
        </div>
      </Section>

      <Section title="Player Base Stats (Roguelike)">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <NumberField label="Starting Hearts" value={rc.startingHearts ?? 3} onChange={(v) => updateField("roguelikeConfig.startingHearts", v)} min={1} max={10} step={1} />
          <NumberField label="Base Reload (s)" value={rc.baseReloadTime ?? 0.35} onChange={(v) => updateField("roguelikeConfig.baseReloadTime", v)} min={0.05} max={2} step={0.01} />
          <NumberField label="Move Speed" value={rc.baseMovementSpeed ?? 90} onChange={(v) => updateField("roguelikeConfig.baseMovementSpeed", v)} min={10} max={300} step={5} />
          <NumberField label="Bullet Damage" value={rc.baseBulletDamage ?? 20} onChange={(v) => updateField("roguelikeConfig.baseBulletDamage", v)} min={1} max={500} step={5} />
          <NumberField label="Base Drop Chance" value={rc.baseEnemyDropChance ?? 0.12} onChange={(v) => updateField("roguelikeConfig.baseEnemyDropChance", v)} min={0} max={1} step={0.01} />
        </div>
      </Section>
    </div>
  );

  const PowerupsTab = () => (
    <div className="space-y-4">
      <Section title="Spawn Settings">
        <div className="grid grid-cols-1 gap-4">
          <NumberField label="Spawn Chance (0–1)" value={settings.powerUpSpawnChance} onChange={(v) => updateField("powerUpSpawnChance", v)} min={0} max={1} step={0.01} />
          <NumberField label="Boss Projectile Drop Rate (0–1)" value={settings.bossProjectileDropRate} onChange={(v) => updateField("bossProjectileDropRate", v)} min={0} max={1} step={0.01} />
          <NumberField label="Power-Up Size (px)" value={settings.powerUpSize} onChange={(v) => updateField("powerUpSize", v)} min={4} max={32} step={1} />
        </div>
        <p className="text-xs text-neutral-500 mt-2">Chance to drop a power-up when an enemy is killed. 0.12 = 12%.</p>
      </Section>

      <Section title="Temp Power-Up Durations (seconds)">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <NumberField label="Rapid Fire" value={settings.powerUpDurations.rapid} onChange={(v) => updateField("powerUpDurations.rapid", v)} min={1} max={60} step={1} />
          <NumberField label="Wide Shot" value={settings.powerUpDurations.wideShot} onChange={(v) => updateField("powerUpDurations.wideShot", v)} min={1} max={60} step={1} />
          <NumberField label="Projectile" value={settings.powerUpDurations.projectile ?? 4} onChange={(v) => updateField("powerUpDurations.projectile", v)} min={1} max={60} step={1} />
          <NumberField label="Invincible" value={settings.powerUpDurations.invincible} onChange={(v) => updateField("powerUpDurations.invincible", v)} min={1} max={60} step={1} />
        </div>
      </Section>

      <Section title="Power-Up Drop Rates">
        <p className="text-xs text-neutral-500 mb-3">Relative spawn weights — they&apos;re normalised automatically, so only the ratios matter. Set to 0 to disable a type.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <NumberField label="Rapid Fire" value={settings.powerUpDropRates?.rapid ?? 1} onChange={(v) => updateField("powerUpDropRates.rapid", v)} min={0} max={100} step={1} />
          <NumberField label="Wide Shot" value={settings.powerUpDropRates?.wideshot ?? 1} onChange={(v) => updateField("powerUpDropRates.wideshot", v)} min={0} max={100} step={1} />
          <NumberField label="Projectile" value={settings.powerUpDropRates?.projectile ?? 1} onChange={(v) => updateField("powerUpDropRates.projectile", v)} min={0} max={100} step={1} />
          <NumberField label="Extra Life" value={settings.powerUpDropRates?.extralife ?? 1} onChange={(v) => updateField("powerUpDropRates.extralife", v)} min={0} max={100} step={1} />
          <NumberField label="Invincible" value={settings.powerUpDropRates?.invincible ?? 1} onChange={(v) => updateField("powerUpDropRates.invincible", v)} min={0} max={100} step={1} />
        </div>
      </Section>

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
    </div>
  );

  const RoguelikeTab = () => {
    const rf        = rc.rapidFire   ?? { ratePerStack: 0.02, minCooldown: 0.05 };
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
    const proj      = rc.projectile  ?? { projectilesPerStack: 1, superBulletThreshold: 10, superBulletSizeMultiplier: 2.5, redSize: 10, purpleSize: 12, goldSize: 14 };
    const luck      = rc.luck        ?? { dropChancePerStack: 0.01 };
    const extraLife = rc.extraLife   ?? { heartsPerStack: 1 };
    const health    = rc.health      ?? { slicesProgression: [1, 2, 3, 4] };

    return (
      <div className="space-y-4">
        <Section title="Rapid Fire (perm upgrade)">
          <div className="grid grid-cols-2 gap-4">
            <NumberField label="Rate/Stack" value={rf.ratePerStack ?? 0.02} onChange={(v) => upRc("rapidFire", { ratePerStack: v })} min={0} max={0.5} step={0.005} />
            <NumberField label="Min Cooldown (s)" value={rf.minCooldown ?? 0.05} onChange={(v) => upRc("rapidFire", { minCooldown: v })} min={0.01} max={1} step={0.01} />
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
            <NumberField label="Missile Size (px)" value={seeker.missileSize ?? 6} onChange={(v) => upRc("seeker", { missileSize: v })} min={2} max={30} step={1} />
          </div>
        </Section>

        <Section title="Orbital (perm upgrade)">
          <p className="text-xs text-neutral-500 mb-3">Energy orbits orbit the player, damaging enemies on contact. Each stack adds another orb.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <NumberField label="Orb Damage" value={orbital.damage ?? 30} onChange={(v) => upRc("orbital", { damage: v })} min={1} max={500} step={5} />
            <NumberField label="Orbit Speed (rad/s)" value={orbital.orbitSpeed ?? 2.5} onChange={(v) => upRc("orbital", { orbitSpeed: v })} min={0.1} max={20} step={0.1} />
            <NumberField label="Orb Size (px)" value={orbital.orbSize ?? 8} onChange={(v) => upRc("orbital", { orbSize: v })} min={2} max={30} step={1} />
            <NumberField label="Hitbox Size (px)" value={orbital.hitboxSize ?? 8} onChange={(v) => upRc("orbital", { hitboxSize: v })} min={1} max={50} step={1} />
            <NumberField label="Orbit Radius (px)" value={orbital.orbitRadius ?? 35} onChange={(v) => upRc("orbital", { orbitRadius: v })} min={10} max={100} step={1} />
            <NumberField label="Active Duration (s)" value={orbital.duration ?? 10} onChange={(v) => upRc("orbital", { duration: v })} min={1} max={60} step={1} />
            <NumberField label="Cooldown (s)" value={orbital.cooldown ?? 10} onChange={(v) => upRc("orbital", { cooldown: v })} min={1} max={60} step={1} />
          </div>
        </Section>

        <Section title="Super Bullet (Projectile tiers)">
          <p className="text-xs text-neutral-500 mb-3">Normal (max 3) → Red (max 3) → Purple (max 3) → Gold (max 3). Picking a new tier converts 3 of the previous tier into 1 of the new tier.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <NumberField label="Red Size (px)" value={proj.redSize ?? 10} onChange={(v) => upRc("projectile", { redSize: v })} min={1} max={50} step={1} />
            <NumberField label="Red Damage" value={proj.redDamage ?? 30} onChange={(v) => upRc("projectile", { redDamage: v })} min={1} max={500} step={1} />
            <NumberField label="Purple Size (px)" value={proj.purpleSize ?? 12} onChange={(v) => upRc("projectile", { purpleSize: v })} min={1} max={50} step={1} />
            <NumberField label="Purple Damage" value={proj.purpleDamage ?? 50} onChange={(v) => upRc("projectile", { purpleDamage: v })} min={1} max={500} step={1} />
            <NumberField label="Gold Size (px)" value={proj.goldSize ?? 14} onChange={(v) => upRc("projectile", { goldSize: v })} min={1} max={50} step={1} />
            <NumberField label="Gold Damage" value={proj.goldDamage ?? 80} onChange={(v) => upRc("projectile", { goldDamage: v })} min={1} max={500} step={1} />
            <NumberField label="Size Multiplier (legacy)" value={proj.superBulletSizeMultiplier ?? 2.5} onChange={(v) => upRc("projectile", { superBulletSizeMultiplier: v })} min={1} max={10} step={0.1} />
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <NumberField label="Duration (s)" value={shield.duration ?? 10} onChange={(v) => upRc("shield", { duration: v })} min={1} max={60} step={1} />
            <NumberField label="Cooldown (s)" value={shield.cooldown ?? 30} onChange={(v) => upRc("shield", { cooldown: v })} min={1} max={120} step={1} />
            <NumberField label="Visual Size (scale)" value={settings.permShield?.size ?? 1} onChange={(v) => updateField("permShield.size", v)} min={0.1} max={5} step={0.1} />
          </div>
          <p className="text-xs text-neutral-500 mt-2">Visual Size scales the shield sprite. Radius and offset are in the Layout tab.</p>
        </Section>

        <Section title="Health (Slices)">
          <p className="text-xs text-neutral-500 mb-3">How many slices each heart is divided into at each Health stack level. Index 0 = no stacks (1 slice = 1 heart).</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(health.slicesProgression ?? [1, 2, 3, 4]).map((val, idx) => (
              <NumberField key={idx} label={`Stack ${idx} slices`} value={val} onChange={(v) => {
                const next = [...(health.slicesProgression ?? [1, 2, 3, 4])];
                next[idx] = Math.max(1, Math.round(v));
                upRc("health", { slicesProgression: next });
              }} min={1} max={20} step={1} />
            ))}
          </div>
        </Section>

        <Section title="Other Perm Upgrades">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <NumberField label="Speed/Stack" value={speed.speedPerStack ?? 0.01} onChange={(v) => upRc("speed", { speedPerStack: v })} min={0} max={0.5} step={0.005} />
            <NumberField label="Strength/Stack" value={strength.damagePerStack ?? 0.02} onChange={(v) => upRc("strength", { damagePerStack: v })} min={0} max={0.5} step={0.005} />
            <NumberField label="Luck/Stack" value={luck.dropChancePerStack ?? 0.01} onChange={(v) => upRc("luck", { dropChancePerStack: v })} min={0} max={0.5} step={0.005} />
            <NumberField label="Extra Life Hearts/Stack" value={extraLife.heartsPerStack ?? 1} onChange={(v) => upRc("extraLife", { heartsPerStack: v })} min={1} max={5} step={1} />
          </div>
        </Section>

        <Section title="Permanent Power-Ups (enable/disable)">
          <p className="text-xs text-neutral-500 mb-3">Disable individual permanent upgrades to stop them appearing on the selection screen. Useful for testing specific power-ups in isolation.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: "bomb", label: "Bomb" },
              { id: "lightning", label: "Lightning" },
              { id: "connect", label: "Connect Beam" },
              { id: "extraLife", label: "Extra Life" },
              { id: "frenzy", label: "Frenzy" },
              { id: "health", label: "Health (Slices)" },
              { id: "healthRefill", label: "Health Refill" },
              { id: "luck", label: "Luck" },
              { id: "nuke", label: "Nuke" },
              { id: "orbital", label: "Orbital Orbs" },
              { id: "projectile", label: "Extra Projectile" },
              { id: "rapidFire", label: "Rapid Fire" },
              { id: "seeker", label: "Seeker Missile" },
              { id: "shield", label: "Perm Shield" },
              { id: "speed", label: "Speed" },
              { id: "strength", label: "Strength" },
              { id: "superProjectile", label: "Super Projectile (Red)" },
              { id: "superProjectile2", label: "Super Projectile (Purple)" },
              { id: "superProjectile3", label: "Super Projectile (Gold)" },
              { id: "virus", label: "Virus" },
            ].map(({ id, label }) => {
              const disabled = settings.disabledPowerUps ?? [];
              const isEnabled = !disabled.includes(id);
              return (
                <Toggle key={id} label={label} checked={isEnabled} onChange={(v) => {
                  const current = settings.disabledPowerUps ?? [];
                  const next = v ? current.filter((x) => x !== id) : [...current.filter((x) => x !== id), id];
                  updateField("disabledPowerUps", next);
                }} />
              );
            })}
          </div>
        </Section>

        <Section title="Max Stacks (per power-up)">
          <p className="text-xs text-neutral-500 mb-3">Maximum number of times each permanent power-up can be picked per run. Set to -1 for unlimited. Defaults are shown in grey when not overridden.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {POWER_UP_REGISTRY.filter((p) => p.canStack).map((p) => {
              const current = settings.powerUpMaxStacks?.[p.id];
              const isOverridden = current !== undefined;
              return (
                <div key={p.id} className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-400 font-mono">{p.name}</label>
                  <input type="number" value={isOverridden ? current : ""} placeholder={String(p.maxStacks)}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = val === "" ? undefined : parseInt(val, 10);
                      const next = { ...(settings.powerUpMaxStacks ?? {}) };
                      if (num === undefined || isNaN(num)) { delete next[p.id]; } else { next[p.id] = num; }
                      updateField("powerUpMaxStacks", Object.keys(next).length > 0 ? next : undefined);
                    }}
                    className={["w-full px-2 py-1.5 rounded border bg-black text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-yellow-400", isOverridden ? "border-yellow-400/50" : "border-white/10"].join(" ")}
                    min={-1} max={100} step={1}
                  />
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Reward Screen">
          <Toggle label="Show power-up selection after every wave" checked={settings.waveRewardEnabled ?? true} onChange={(v) => updateField("waveRewardEnabled", v)} />
          <p className="text-xs text-neutral-500 mt-2">When on, the permanent power-up selection screen appears after clearing each wave. When off, only boss defeats trigger it.</p>
          <div className="mt-3">
            <NumberField label="Enemy Choice Drop Chance (0–1)" value={settings.enemyChoiceDropChance ?? 0} onChange={(v) => updateField("enemyChoiceDropChance", v)} min={0} max={1} step={0.01} />
          </div>
          <p className="text-xs text-neutral-500">Chance (0–1) that a killed enemy drops a turquoise arrow pickup. Collecting it opens the power-up selection screen mid-wave. 0.05 = 5%.</p>
        </Section>
      </div>
    );
  };

  const VisualsTab = () => (
    <div className="space-y-4">
      <Section title="Damage Numbers">
        <p className="text-xs text-neutral-500 mb-3">Floating numbers that appear when enemies or the player are hit. Colors are CSS hex values.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ColorField label="Player Bullet Color" value={settings.damageNumbers?.playerBulletColor ?? "#ffffff"} onChange={(v) => updateField("damageNumbers.playerBulletColor", v)} />
          <ColorField label="Seeker Missile Color" value={settings.damageNumbers?.seekerColor ?? "#ff4400"} onChange={(v) => updateField("damageNumbers.seekerColor", v)} />
          <ColorField label="Orbital Orb Color" value={settings.damageNumbers?.orbitalColor ?? "#00f0ff"} onChange={(v) => updateField("damageNumbers.orbitalColor", v)} />
          <ColorField label="Player Hit Color" value={settings.damageNumbers?.playerHitColor ?? "#ff4444"} onChange={(v) => updateField("damageNumbers.playerHitColor", v)} />
          <NumberField label="Drift Speed (px/s)" value={settings.damageNumbers?.driftSpeed ?? 18} onChange={(v) => updateField("damageNumbers.driftSpeed", v)} min={1} max={100} step={1} />
          <NumberField label="Font Size (px)" value={settings.damageNumbers?.fontSize ?? 8} onChange={(v) => updateField("damageNumbers.fontSize", v)} min={4} max={32} step={1} />
        </div>
      </Section>
    </div>
  );

  const AudioTab = () => (
    <div className="space-y-4">
      <Section title="SFX Volume Mixer">
        <p className="text-xs text-neutral-500 mb-4">Set per-sound volume multipliers. 1.0 = unchanged, 0.5 = half, 2.0 = double. These are applied globally on top of the player&apos;s master SFX volume. Click ▶ to preview.</p>
        <div className="space-y-3">
          {([
            { key: "shoot", label: "Shoot", type: "procedural" },
            { key: "enemyHit", label: "Enemy Hit", type: "procedural" },
            { key: "playerHit", label: "Player Hit", type: "procedural" },
            { key: "gameOver", label: "Game Over", type: "procedural" },
            { key: "levelComplete", label: "Level Complete", type: "procedural" },
            { key: "bomb", label: "Bomb", type: "file", url: "/audio/bomb.mp3" },
            { key: "lightning", label: "Lightning", type: "file", url: "/audio/lightning.mp3" },
            { key: "powerup", label: "Power-Up", type: "file", url: "/audio/powerup.mp3" },
            { key: "connect", label: "Connect", type: "file", url: "/audio/connect.mp3" },
            { key: "shield", label: "Shield", type: "file", url: "/audio/shield.mp3" },
          ] as { key: string; label: string; type: "procedural" | "file"; url?: string }[]).map(({ key, label, type, url }) => {
            const vol = (settings.sfxVolumes ?? {})[key] ?? 1;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-neutral-400 w-28 shrink-0">{label}</span>
                <input type="range" min={0} max={2} step={0.05} value={vol}
                  onChange={(e) => { const next = { ...(settings.sfxVolumes ?? {}), [key]: parseFloat(e.target.value) }; setSettings((prev) => prev ? { ...prev, sfxVolumes: next } : prev); }}
                  className="flex-1 accent-[#00f0ff]"
                />
                <span className="text-xs font-mono text-neutral-300 w-10 text-right">{vol.toFixed(2)}×</span>
                <button title={`Preview ${label}`} onClick={() => { unlockAudio(); if (type === "file" && url) playFile(url); else play(key as Parameters<typeof play>[0]); }}
                  className="flex items-center gap-1 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] px-2 py-1 text-xs text-neutral-300 transition-colors"
                ><Volume2 className="w-3 h-3" /> ▶</button>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );

  const LeaderboardTab = () => (
    <div className="space-y-4">
      <Section title="Local High Score">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-300">Current local high score: <span className="text-[#fcee0a] font-mono font-bold">{highScore}</span></p>
            <p className="text-xs text-neutral-500 mt-1">Stored in visitors&apos; browsers via localStorage.</p>
          </div>
          <button onClick={handleResetHighScore} className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors">
            <RotateCcw className="w-4 h-4" /> Reset Local Scores
          </button>
        </div>
      </Section>

      <Section title="Global Leaderboard">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-neutral-300">Global leaderboard</p>
            <p className="text-xs text-neutral-500 mt-1">Delete all submitted scores or edit individual entries below.</p>
          </div>
          <button onClick={handleResetLeaderboard} disabled={resettingBoard}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          ><Trophy className="w-4 h-4" /> {resettingBoard ? "Resetting..." : "Reset Scoreboard"}</button>
        </div>
        <div>
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
                      <input type="text" value={editingScore.name} onChange={(e) => setEditingScore({ ...editingScore, name: e.target.value })} className="w-24 rounded border border-[#1e1e1e] bg-[#0a0a0a] px-2 py-1 text-white text-xs" maxLength={20} />
                      <input type="number" value={editingScore.score} onChange={(e) => setEditingScore({ ...editingScore, score: parseInt(e.target.value) || 0 })} className="w-20 rounded border border-[#1e1e1e] bg-[#0a0a0a] px-2 py-1 text-white text-xs" />
                      <input type="number" value={editingScore.wave} onChange={(e) => setEditingScore({ ...editingScore, wave: parseInt(e.target.value) || 1 })} className="w-14 rounded border border-[#1e1e1e] bg-[#0a0a0a] px-2 py-1 text-white text-xs" />
                      <button onClick={handleUpdateScore} className="px-2 py-1 rounded bg-[#00f0ff] text-black text-xs font-bold">Save</button>
                      <button onClick={() => setEditingScore(null)} className="px-2 py-1 rounded bg-[#1e1e1e] text-neutral-300 text-xs">Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="text-[#fcee0a] font-mono w-24 truncate">{entry.name}</span>
                      <span className="text-white font-mono w-20">{entry.score.toLocaleString()}</span>
                      <span className="text-neutral-400 text-xs w-14">W{entry.wave}</span>
                      <button onClick={() => setEditingScore({ id: entry.id, name: entry.name, score: entry.score, wave: entry.wave })} className="ml-auto px-2 py-1 rounded bg-[#1e1e1e] text-neutral-300 text-xs hover:bg-[#2a2a2a]">Edit</button>
                      <button onClick={() => handleDeleteScore(entry.id)} className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20">Delete</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>
    </div>
  );

  // Render tabs via direct function calls instead of JSX elements.
  // This prevents React from unmounting/remounting inputs when the parent
  // re-renders, which was causing number fields to lose focus after 1 keystroke.
  const tabContent: Record<TabId, React.ReactNode> = {
    general: GeneralTab(),
    layout: LayoutTab(),
    enemy: EnemyTab(),
    boss: BossTab(),
    player: PlayerTab(),
    powerups: PowerupsTab(),
    roguelike: RoguelikeTab(),
    visuals: VisualsTab(),
    audio: AudioTab(),
    leaderboard: LeaderboardTab(),
  };

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-[#ff006e]" />
            Secret Game Editor
          </h2>
          <p className="text-sm text-neutral-500">Visually edit the game layout, balance, and settings.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saveOk && <span className="text-xs text-green-400 font-semibold">✓ Saved!</span>}
          {saveError && <span className="text-xs text-red-400 font-semibold" title={saveError}>✗ Save failed</span>}
          <button onClick={handlePreview} className="flex items-center gap-2 rounded-lg border border-[#1e1e1e] bg-[#141414] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a1a1a] transition-colors">
            <Play className="w-4 h-4" /> Preview
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#00f0ff] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Two-column layout: settings left, preview right */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings column */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Tab bar */}
          <div className="flex flex-wrap gap-1 rounded-xl border border-[#1e1e1e] bg-[#141414] p-1.5">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${isActive ? "bg-[#00f0ff] text-black" : "text-neutral-400 hover:text-white hover:bg-[#1e1e1e]"}`}
                >
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
          </div>

          {/* Active tab content */}
          <div className="min-h-[200px]">{tabContent[activeTab]}</div>
        </div>

        {/* Preview column */}
        <div className="lg:w-[400px] shrink-0">
          <div className="sticky top-6 rounded-xl border border-[#1e1e1e] bg-[#141414] p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">Live Preview</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Drag dashed boxes to reposition. Pink = enemies (not draggable).</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setPreviewZoom((z) => Math.max(0.25, parseFloat((z - 0.25).toFixed(2))))} className="p-1.5 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-neutral-300 transition-colors" title="Zoom out"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-xs font-mono text-neutral-400 w-10 text-center">{Math.round(previewZoom * 100)}%</span>
                <button onClick={() => setPreviewZoom((z) => Math.min(4, parseFloat((z + 0.25).toFixed(2))))} className="p-1.5 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-neutral-300 transition-colors" title="Zoom in"><ZoomIn className="w-4 h-4" /></button>
                <button onClick={() => setPreviewZoom(1)} className="ml-1 px-2 py-1 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-neutral-400 text-xs transition-colors" title="Reset zoom">Reset</button>
              </div>
            </div>
            <div className="overflow-auto rounded-xl" style={{ maxHeight: "90vh" }} onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setPreviewZoom((z) => Math.min(4, Math.max(0.25, parseFloat((z + (e.deltaY < 0 ? 0.1 : -0.1)).toFixed(2))))); }}}>
              <GameEditorPreview
                settings={plat}
                playerSprite={settings.playerSprite}
                bossSettings={settings.boss}
                platform={platform}
                zoom={previewZoom}
                hitboxPoints={settings.playerHitbox?.points}
                bulletSpawnOffsetX={settings.bulletSpawnOffsetX}
                bulletSpawnOffsetY={settings.bulletSpawnOffsetY}
                mouseFollowOffsetX={settings.mouseFollowOffsetX}
                mouseFollowOffsetY={settings.mouseFollowOffsetY}
                spawnPoints={plat.spawnPoints}
                onChange={updatePlatform}
                onBossChange={(next) => setSettings((prev) => prev ? { ...prev, boss: next } : prev)}
                onHitboxChange={(points) => setSettings((prev) => prev ? { ...prev, playerHitbox: { ...(prev.playerHitbox ?? {}), points } } : prev)}
                onBulletSpawnChange={(ox, oy) => setSettings((prev) => prev ? { ...prev, bulletSpawnOffsetX: ox, bulletSpawnOffsetY: oy } : prev)}
                onMouseFollowChange={(ox, oy) => setSettings((prev) => prev ? { ...prev, mouseFollowOffsetX: ox, mouseFollowOffsetY: oy } : prev)}
                onSpawnPointsChange={(next) => updateField(`${platform}.spawnPoints`, next)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared UI components ────────────────────────────────────────────────────

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
      <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
      />
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">{label}</label>
      <input type="number" value={value} min={min} max={max} step={step} onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
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

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-12 rounded cursor-pointer bg-transparent border border-neutral-700" />
        <span className="text-xs text-neutral-400 font-mono">{value}</span>
      </div>
    </div>
  );
}
