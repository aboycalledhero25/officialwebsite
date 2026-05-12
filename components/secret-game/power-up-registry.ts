/**
 * POWER-UP REGISTRY
 * ──────────────────
 * All 18 permanent power-up definitions live here.
 * Add new power-ups by appending to POWER_UP_REGISTRY.
 * The Game Editor can read this list to display/edit entries.
 */

import { ROGUELIKE_CONFIG } from "./power-up-config";
import { type PermPowerUpState, computePlayerStats } from "./player-stats";

export interface PowerUpDefinition {
  id: string;
  name: string;
  description: string;
  /** Path under /public — e.g. /powerups/icons/bomb.png */
  icon: string;
  canStack: boolean;
  /** -1 = unlimited */
  maxStacks: number;
  /** Remove from pool once maxStacks is reached */
  removeFromPoolAfterMaxed: boolean;
  /** Human-readable current stat value */
  getCurrentStat: (chosen: PermPowerUpState) => string;
  /** Human-readable stat value after picking this power-up (shown in green) */
  getNextStat: (chosen: PermPowerUpState) => string;
}

export const POWER_UP_REGISTRY: PowerUpDefinition[] = [
  {
    id: "bomb",
    name: "Bomb",
    description: "Every 30s drops bombs in a cross pattern, damaging nearby enemies.",
    icon: "/powerups/icons/bomb.png",
    canStack: true, maxStacks: -1, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => {
      const n = c["bomb"] ?? 0;
      return n === 0 ? "Bombs: 0" : `Bombs: ${n * ROGUELIKE_CONFIG.bomb.bombsPerStack}/cooldown`;
    },
    getNextStat: (c) => `Bombs: ${((c["bomb"] ?? 0) + 1) * ROGUELIKE_CONFIG.bomb.bombsPerStack}/cooldown`,
  },
  {
    id: "lightning",
    name: "Lightning",
    description: "Every 30s, lightning strikes random enemies.",
    icon: "/powerups/icons/lightning.png",
    canStack: true, maxStacks: -1, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => {
      const n = c["lightning"] ?? 0;
      if (n === 0) return "Strikes: 0";
      return `Strikes: ${ROGUELIKE_CONFIG.lightning.baseStrikes + (n - 1) * ROGUELIKE_CONFIG.lightning.strikesPerStack}`;
    },
    getNextStat: (c) => {
      const n = c["lightning"] ?? 0;
      return `Strikes: ${ROGUELIKE_CONFIG.lightning.baseStrikes + n * ROGUELIKE_CONFIG.lightning.strikesPerStack}`;
    },
  },
  {
    id: "connect",
    name: "Connect",
    description: "Links lightning strike points with damaging bolts. Requires Lightning.",
    icon: "/powerups/icons/connect.png",
    canStack: true, maxStacks: 3, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["connect"] ?? 0;
      if (n === 0) return "Bolt Damage: —";
      return `Bolt Damage: ${ROGUELIKE_CONFIG.connect.damage + (n - 1) * ROGUELIKE_CONFIG.connect.damagePerStack}`;
    },
    getNextStat: (c) => {
      const n = c["connect"] ?? 0;
      return `Bolt Damage: ${ROGUELIKE_CONFIG.connect.damage + n * ROGUELIKE_CONFIG.connect.damagePerStack}`;
    },
  },
  {
    id: "extraLife",
    name: "Extra Life",
    description: "+1 permanent heart. Heart UI expands automatically.",
    icon: "/powerups/icons/extra_life.png",
    canStack: true, maxStacks: -1, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => `Hearts: ${ROGUELIKE_CONFIG.startingHearts + (c["extraLife"] ?? 0) * ROGUELIKE_CONFIG.extraLife.heartsPerStack}`,
    getNextStat:    (c) => `Hearts: ${ROGUELIKE_CONFIG.startingHearts + ((c["extraLife"] ?? 0) + 1) * ROGUELIKE_CONFIG.extraLife.heartsPerStack}`,
  },
  {
    id: "fastReload",
    name: "Fast Reload",
    description: "Reduces reload time by 1% of base per pick.",
    icon: "/powerups/icons/fast_reload.png",
    canStack: true, maxStacks: -1, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => `Reload: ${computePlayerStats(c).reloadTime.toFixed(2)}s`,
    getNextStat:    (c) => `Reload: ${computePlayerStats({ ...c, fastReload: (c["fastReload"] ?? 0) + 1 }).reloadTime.toFixed(2)}s`,
  },
  {
    id: "frenzy",
    name: "Frenzy",
    description: "Every 30s fires projectiles outward in a full circle.",
    icon: "/powerups/icons/frenzy.png",
    canStack: true, maxStacks: -1, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => {
      const n = c["frenzy"] ?? 0;
      if (n === 0) return "Circle Shots: 0";
      return `Circle Shots: ${ROGUELIKE_CONFIG.frenzy.baseProjectiles + (n - 1) * ROGUELIKE_CONFIG.frenzy.projectilesPerStack}`;
    },
    getNextStat: (c) => {
      const n = c["frenzy"] ?? 0;
      return `Circle Shots: ${ROGUELIKE_CONFIG.frenzy.baseProjectiles + n * ROGUELIKE_CONFIG.frenzy.projectilesPerStack}`;
    },
  },
  {
    id: "healthRefill",
    name: "Health Refill",
    description: "Immediately refills all hearts to maximum.",
    icon: "/powerups/icons/health_refill.png",
    canStack: false, maxStacks: -1, removeFromPoolAfterMaxed: false,
    getCurrentStat: () => "Instant refill",
    getNextStat:    () => "Refill all hearts now",
  },
  {
    id: "health",
    name: "Health",
    description: "Divides hearts into slices — each hit removes 1 slice, not 1 full heart.",
    icon: "/powerups/icons/health.png",
    canStack: true, maxStacks: 3, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["health"] ?? 0;
      const idx = Math.min(n, ROGUELIKE_CONFIG.health.slicesProgression.length - 1);
      return `Slices/Heart: ${ROGUELIKE_CONFIG.health.slicesProgression[idx]}`;
    },
    getNextStat: (c) => {
      const n = c["health"] ?? 0;
      const idx = Math.min(n + 1, ROGUELIKE_CONFIG.health.slicesProgression.length - 1);
      return `Slices/Heart: ${ROGUELIKE_CONFIG.health.slicesProgression[idx]}`;
    },
  },
  {
    id: "luck",
    name: "Luck",
    description: "+1% enemy power-up drop chance per pick.",
    icon: "/powerups/icons/luck.png",
    canStack: true, maxStacks: -1, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => `Drop Chance: ${((ROGUELIKE_CONFIG.baseEnemyDropChance + (c["luck"] ?? 0) * ROGUELIKE_CONFIG.luck.dropChancePerStack) * 100).toFixed(0)}%`,
    getNextStat:    (c) => `Drop Chance: ${((ROGUELIKE_CONFIG.baseEnemyDropChance + ((c["luck"] ?? 0) + 1) * ROGUELIKE_CONFIG.luck.dropChancePerStack) * 100).toFixed(0)}%`,
  },
  {
    id: "machineGun",
    name: "Machine Gun",
    description: "Each shot fires a rapid burst of bullets.",
    icon: "/powerups/icons/machine_gun.png",
    canStack: true, maxStacks: -1, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => {
      const n = c["machineGun"] ?? 0;
      if (n === 0) return "Burst: 1";
      return `Burst: ${ROGUELIKE_CONFIG.machineGun.baseBurst + (n - 1) * ROGUELIKE_CONFIG.machineGun.burstPerStack}`;
    },
    getNextStat: (c) => {
      const n = c["machineGun"] ?? 0;
      return `Burst: ${ROGUELIKE_CONFIG.machineGun.baseBurst + n * ROGUELIKE_CONFIG.machineGun.burstPerStack}`;
    },
  },
  {
    id: "nuke",
    name: "Nuke",
    description: "Every 30s destroys all normal enemies and deals 25% HP to bosses.",
    icon: "/powerups/icons/nuke.png",
    canStack: true, maxStacks: -1, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => {
      const n = c["nuke"] ?? 0;
      if (n === 0) return "Nukes/cooldown: 0";
      return `Nukes/cooldown: ${n * ROGUELIKE_CONFIG.nuke.nukesPerStack}`;
    },
    getNextStat: (c) => `Nukes/cooldown: ${((c["nuke"] ?? 0) + 1) * ROGUELIKE_CONFIG.nuke.nukesPerStack}`,
  },
  {
    id: "projectile",
    name: "Projectile",
    description: "Adds +1 projectile per shot.",
    icon: "/powerups/icons/projectile.png",
    canStack: true, maxStacks: -1, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => `Projectiles: ${1 + (c["projectile"] ?? 0) * ROGUELIKE_CONFIG.projectile.projectilesPerStack}`,
    getNextStat:    (c) => `Projectiles: ${1 + ((c["projectile"] ?? 0) + 1) * ROGUELIKE_CONFIG.projectile.projectilesPerStack}`,
  },
  {
    id: "rapidFire",
    name: "Rapid Fire",
    description: "Increases fire rate by 2% of base per pick.",
    icon: "/powerups/icons/rapid_fire.png",
    canStack: true, maxStacks: -1, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => `Fire Cooldown: ${computePlayerStats(c).reloadTime.toFixed(2)}s`,
    getNextStat:    (c) => `Fire Cooldown: ${computePlayerStats({ ...c, rapidFire: (c["rapidFire"] ?? 0) + 1 }).reloadTime.toFixed(2)}s`,
  },
  {
    id: "seeker",
    name: "Seeker",
    description: "Projectiles home in on the nearest enemy.",
    icon: "/powerups/icons/seeker.png",
    canStack: true, maxStacks: 5, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["seeker"] ?? 0;
      if (n === 0) return "Homing: Off";
      return `Homing Strength: ${ROGUELIKE_CONFIG.seeker.homingStrengthBase + (n - 1) * ROGUELIKE_CONFIG.seeker.homingPerStack}`;
    },
    getNextStat: (c) => {
      const n = c["seeker"] ?? 0;
      return `Homing Strength: ${ROGUELIKE_CONFIG.seeker.homingStrengthBase + n * ROGUELIKE_CONFIG.seeker.homingPerStack}`;
    },
  },
  {
    id: "shield",
    name: "Shield",
    description: "A protective shield activates every 30s, blocking all damage for 10s.",
    icon: "/powerups/icons/shield.png",
    canStack: false, maxStacks: 1, removeFromPoolAfterMaxed: true,
    getCurrentStat: () => "Shield: Off",
    getNextStat:    () => `Shield: ${ROGUELIKE_CONFIG.shield.duration}s / ${ROGUELIKE_CONFIG.shield.cooldown}s cooldown`,
  },
  {
    id: "speed",
    name: "Speed",
    description: "+1% movement speed per pick.",
    icon: "/powerups/icons/speed.png",
    canStack: true, maxStacks: -1, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => `Speed: ${(100 + (c["speed"] ?? 0) * ROGUELIKE_CONFIG.speed.speedPerStack * 100).toFixed(0)}%`,
    getNextStat:    (c) => `Speed: ${(100 + ((c["speed"] ?? 0) + 1) * ROGUELIKE_CONFIG.speed.speedPerStack * 100).toFixed(0)}%`,
  },
  {
    id: "strength",
    name: "Strength",
    description: "+2% bullet damage per pick.",
    icon: "/powerups/icons/strength.png",
    canStack: true, maxStacks: -1, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => `Damage: ${(100 + (c["strength"] ?? 0) * ROGUELIKE_CONFIG.strength.damagePerStack * 100).toFixed(0)}%`,
    getNextStat:    (c) => `Damage: ${(100 + ((c["strength"] ?? 0) + 1) * ROGUELIKE_CONFIG.strength.damagePerStack * 100).toFixed(0)}%`,
  },
  {
    id: "virus",
    name: "Virus",
    description: "20% chance to infect enemies on hit, dealing damage over time (boss-effective).",
    icon: "/powerups/icons/virus.png",
    canStack: true, maxStacks: -1, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => {
      const n = c["virus"] ?? 0;
      if (n === 0) return "Infect Chance: 0%";
      const pct = ((ROGUELIKE_CONFIG.virus.baseInfectionChance + (n - 1) * ROGUELIKE_CONFIG.virus.chancePerStack) * 100).toFixed(0);
      const dmg = ROGUELIKE_CONFIG.virus.baseDamagePerTick + (n - 1) * ROGUELIKE_CONFIG.virus.damagePerStack;
      return `${pct}% chance, ${dmg} dmg/tick`;
    },
    getNextStat: (c) => {
      const n = c["virus"] ?? 0;
      const pct = ((ROGUELIKE_CONFIG.virus.baseInfectionChance + n * ROGUELIKE_CONFIG.virus.chancePerStack) * 100).toFixed(0);
      const dmg = ROGUELIKE_CONFIG.virus.baseDamagePerTick + n * ROGUELIKE_CONFIG.virus.damagePerStack;
      return `${pct}% chance, ${dmg} dmg/tick`;
    },
  },
];

// ─── Utility helpers ──────────────────────────────────────────────────────────

/** Look up a definition by ID. */
export function getPowerUp(id: string): PowerUpDefinition | undefined {
  return POWER_UP_REGISTRY.find((p) => p.id === id);
}

/** Return all IDs that are still available (not maxed, not disabled). */
export function getAvailableIds(chosen: PermPowerUpState, disabledIds: string[] = []): string[] {
  const disabledSet = new Set(disabledIds);
  return POWER_UP_REGISTRY.filter((p) => {
    if (disabledSet.has(p.id)) return false;
    const stacks = chosen[p.id] ?? 0;
    return p.maxStacks === -1 || stacks < p.maxStacks;
  }).map((p) => p.id);
}

/** Pick `count` random unique IDs from the available pool. */
export function pickRandomChoices(chosen: PermPowerUpState, count = 3, disabledIds: string[] = []): string[] {
  const available = getAvailableIds(chosen, disabledIds);
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
