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
    canStack: true, maxStacks: 6, removeFromPoolAfterMaxed: true,
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
    canStack: true, maxStacks: 5, removeFromPoolAfterMaxed: true,
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
    canStack: true, maxStacks: 2, removeFromPoolAfterMaxed: true,
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
    canStack: true, maxStacks: 6, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => `Hearts: ${ROGUELIKE_CONFIG.startingHearts + (c["extraLife"] ?? 0) * ROGUELIKE_CONFIG.extraLife.heartsPerStack}`,
    getNextStat:    (c) => `Hearts: ${ROGUELIKE_CONFIG.startingHearts + ((c["extraLife"] ?? 0) + 1) * ROGUELIKE_CONFIG.extraLife.heartsPerStack}`,
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
      if (n > 20) {
        const shots = ROGUELIKE_CONFIG.frenzy.baseProjectiles + 19 * ROGUELIKE_CONFIG.frenzy.projectilesPerStack;
        const dmg = ROGUELIKE_CONFIG.frenzy.damage + (n - 20) * (ROGUELIKE_CONFIG.frenzy.damagePerStack ?? 5);
        return `Shots: ${shots}, Dmg: ${dmg}`;
      }
      return `Circle Shots: ${ROGUELIKE_CONFIG.frenzy.baseProjectiles + (n - 1) * ROGUELIKE_CONFIG.frenzy.projectilesPerStack}`;
    },
    getNextStat: (c) => {
      const n = c["frenzy"] ?? 0;
      if (n >= 20) {
        const dmg = ROGUELIKE_CONFIG.frenzy.damage + (n + 1 - 20) * (ROGUELIKE_CONFIG.frenzy.damagePerStack ?? 5);
        return `Dmg: ${dmg}`;
      }
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
    id: "nuke",
    name: "Nuke",
    description: "Every 30s destroys all normal enemies and deals 25% HP to bosses.",
    icon: "/powerups/icons/nuke.png",
    canStack: false, maxStacks: 1, removeFromPoolAfterMaxed: true,
    getCurrentStat: () => "Nuke: Off",
    getNextStat: () => `Nuke: clears wave every ${ROGUELIKE_CONFIG.nuke.cooldown}s`,
  },
  {
    id: "projectile",
    name: "Projectile",
    description: "Adds +1 projectile per shot. Max 3 projectiles, then unlocks Super Projectile (Red).",
    icon: "/powerups/icons/projectile.png",
    canStack: true, maxStacks: 3, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["projectile"] ?? 0;
      const count = Math.min(n + 1, 3);
      return n === 0 ? "Projectiles: 1" : `Projectiles: ${count} (Normal)`;
    },
    getNextStat: (c) => {
      const n = c["projectile"] ?? 0;
      const count = Math.min(n + 2, 3);
      return `Projectiles: ${count} (Normal)`;
    },
  },
  {
    id: "superProjectile",
    name: "Super Projectile (Red)",
    description: `Red super projectile. Each pick adds +1 projectile (${ROGUELIKE_CONFIG.projectile.redDamage} dmg). Max 3, then unlocks Purple.`,
    icon: "/powerups/icons/super_projectile.png",
    canStack: true, maxStacks: 3, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["superProjectile"] ?? 0;
      return n === 0 ? "Red: 0" : `Red: ${n} projectile${n > 1 ? "s" : ""} (${n * ROGUELIKE_CONFIG.projectile.redDamage} dmg)`;
    },
    getNextStat: (c) => {
      const n = (c["superProjectile"] ?? 0) + 1;
      return `Red: ${n} projectile${n > 1 ? "s" : ""} (${n * ROGUELIKE_CONFIG.projectile.redDamage} dmg)`;
    },
  },
  {
    id: "superProjectile2",
    name: "Super Projectile (Purple)",
    description: `Purple super projectile. Each pick adds +1 projectile (${ROGUELIKE_CONFIG.projectile.purpleDamage} dmg). Max 3, then unlocks Gold.`,
    icon: "/powerups/icons/super_projectile2.png",
    canStack: true, maxStacks: 3, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["superProjectile2"] ?? 0;
      return n === 0 ? "Purple: 0" : `Purple: ${n} projectile${n > 1 ? "s" : ""} (${n * ROGUELIKE_CONFIG.projectile.purpleDamage} dmg)`;
    },
    getNextStat: (c) => {
      const n = (c["superProjectile2"] ?? 0) + 1;
      return `Purple: ${n} projectile${n > 1 ? "s" : ""} (${n * ROGUELIKE_CONFIG.projectile.purpleDamage} dmg)`;
    },
  },
  {
    id: "superProjectile3",
    name: "Super Projectile (Gold)",
    description: `Gold super projectile. Each pick adds +1 projectile (${ROGUELIKE_CONFIG.projectile.goldDamage} dmg). Max 3.`,
    icon: "/powerups/icons/super_projectile3.png",
    canStack: true, maxStacks: 3, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["superProjectile3"] ?? 0;
      return n === 0 ? "Gold: 0" : `Gold: ${n} projectile${n > 1 ? "s" : ""} (${n * ROGUELIKE_CONFIG.projectile.goldDamage} dmg)`;
    },
    getNextStat: (c) => {
      const n = (c["superProjectile3"] ?? 0) + 1;
      return `Gold: ${n} projectile${n > 1 ? "s" : ""} (${n * ROGUELIKE_CONFIG.projectile.goldDamage} dmg)`;
    },
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
    description: `Fires a homing missile at the nearest enemy every ${ROGUELIKE_CONFIG.seeker.missileCooldown}s. Each pick adds another missile per volley.`,
    icon: "/powerups/icons/seeker.png",
    canStack: true, maxStacks: 5, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["seeker"] ?? 0;
      if (n === 0) return "Missiles: 0";
      return `Missiles: ${n * ROGUELIKE_CONFIG.seeker.missilesPerStack} every ${ROGUELIKE_CONFIG.seeker.missileCooldown}s`;
    },
    getNextStat: (c) => {
      const n = (c["seeker"] ?? 0) + 1;
      return `Missiles: ${n * ROGUELIKE_CONFIG.seeker.missilesPerStack} every ${ROGUELIKE_CONFIG.seeker.missileCooldown}s`;
    },
  },
  {
    id: "orbital",
    name: "Orbital",
    description: `Energy orbs orbit the player for ${ROGUELIKE_CONFIG.orbital.duration}s, damaging enemies on contact. Each pick adds another orb.`,
    icon: "/powerups/icons/orbital.png",
    canStack: true, maxStacks: -1, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => {
      const n = c["orbital"] ?? 0;
      if (n === 0) return "Orbs: 0";
      return `Orbs: ${n}, Dmg: ${ROGUELIKE_CONFIG.orbital.damage}`;
    },
    getNextStat: (c) => {
      const n = (c["orbital"] ?? 0) + 1;
      return `Orbs: ${n}, Dmg: ${ROGUELIKE_CONFIG.orbital.damage}`;
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
    description: "+1% bullet damage per pick.",
    icon: "/powerups/icons/strength.png",
    canStack: true, maxStacks: 50, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => `Damage: ${(100 + (c["strength"] ?? 0) * ROGUELIKE_CONFIG.strength.damagePerStack * 100).toFixed(0)}%`,
    getNextStat:    (c) => `Damage: ${(100 + ((c["strength"] ?? 0) + 1) * ROGUELIKE_CONFIG.strength.damagePerStack * 100).toFixed(0)}%`,
  },
  {
    id: "virus",
    name: "Virus",
    description: "20% chance to infect enemies on hit, dealing damage over time (boss-effective).",
    icon: "/powerups/icons/virus.png",
    canStack: false, maxStacks: 1, removeFromPoolAfterMaxed: true,
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
  {
    id: "vampirism",
    name: "Vampirism",
    description: "Heal 1 heart slice every N kills.",
    icon: "/powerups/icons/vampirism.png",
    canStack: true, maxStacks: 5, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["vampirism"] ?? 0;
      if (n === 0) return "Heal every: — kills";
      const kills = Math.max(1, ROGUELIKE_CONFIG.vampirism.baseKills - (n - 1) * ROGUELIKE_CONFIG.vampirism.killsPerStack);
      return `Heal every ${kills} kills`;
    },
    getNextStat: (c) => {
      const n = (c["vampirism"] ?? 0) + 1;
      const kills = Math.max(1, ROGUELIKE_CONFIG.vampirism.baseKills - (n - 1) * ROGUELIKE_CONFIG.vampirism.killsPerStack);
      return `Heal every ${kills} kills`;
    },
  },
  {
    id: "bounce",
    name: "Bounce",
    description: "Player bullets bounce off screen edges.",
    icon: "/powerups/icons/bounce.png",
    canStack: true, maxStacks: 3, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["bounce"] ?? 0;
      if (n === 0) return "Bounces: 0";
      const bounces = Math.min(n * ROGUELIKE_CONFIG.bounce.bouncesPerStack, ROGUELIKE_CONFIG.bounce.maxBounces);
      return `Bounces: ${bounces}`;
    },
    getNextStat: (c) => {
      const n = (c["bounce"] ?? 0) + 1;
      const bounces = Math.min(n * ROGUELIKE_CONFIG.bounce.bouncesPerStack, ROGUELIKE_CONFIG.bounce.maxBounces);
      return `Bounces: ${bounces}`;
    },
  },
  {
    id: "magnet",
    name: "Magnet",
    description: "Pulls power-up drops toward the player.",
    icon: "/powerups/icons/magnet.png",
    canStack: true, maxStacks: 5, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => {
      const n = c["magnet"] ?? 0;
      if (n === 0) return "Radius: 0";
      const r = ROGUELIKE_CONFIG.magnet.baseRadius + (n - 1) * ROGUELIKE_CONFIG.magnet.radiusPerStack;
      return `Radius: ${r}px`;
    },
    getNextStat: (c) => {
      const n = (c["magnet"] ?? 0) + 1;
      const r = ROGUELIKE_CONFIG.magnet.baseRadius + (n - 1) * ROGUELIKE_CONFIG.magnet.radiusPerStack;
      return `Radius: ${r}px`;
    },
  },
  {
    id: "pierce",
    name: "Pierce",
    description: "Bullets pass through enemies, hitting multiple targets.",
    icon: "/powerups/icons/pierce.png",
    canStack: true, maxStacks: 5, removeFromPoolAfterMaxed: false,
    getCurrentStat: (c) => {
      const n = c["pierce"] ?? 0;
      if (n === 0) return "Pierce: 0";
      return `Pierce: ${n * ROGUELIKE_CONFIG.pierce.piercePerStack}`;
    },
    getNextStat: (c) => {
      const n = (c["pierce"] ?? 0) + 1;
      return `Pierce: ${n * ROGUELIKE_CONFIG.pierce.piercePerStack}`;
    },
  },
  {
    id: "secondWind",
    name: "Second Wind",
    description: "Once per run, survive a lethal hit with 1 slice instead of dying.",
    icon: "/powerups/icons/second_wind.png",
    canStack: false, maxStacks: 1, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => (c["secondWind"] ?? 0) > 0 ? "Second Wind: Ready" : "Second Wind: —",
    getNextStat:    () => "Second Wind: Ready",
  },
  {
    id: "thorns",
    name: "Thorns",
    description: "Enemies take damage when they touch you.",
    icon: "/powerups/icons/thorns.png",
    canStack: true, maxStacks: ROGUELIKE_CONFIG.thorns.maxStacks, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["thorns"] ?? 0;
      if (n === 0) return "Thorns: 0";
      return `Thorns: ${n * ROGUELIKE_CONFIG.thorns.damagePerStack} dmg`;
    },
    getNextStat: (c) => {
      const n = (c["thorns"] ?? 0) + 1;
      return `Thorns: ${n * ROGUELIKE_CONFIG.thorns.damagePerStack} dmg`;
    },
  },
  {
    id: "timeDilation",
    name: "Time Dilation",
    description: "All temporary power-ups last 50% longer per pick.",
    icon: "/powerups/icons/time_dilation.png",
    canStack: true, maxStacks: ROGUELIKE_CONFIG.timeDilation.maxStacks, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["timeDilation"] ?? 0;
      if (n === 0) return "Duration: +0%";
      return `Duration: +${(n * ROGUELIKE_CONFIG.timeDilation.durationBonusPerStack * 100).toFixed(0)}%`;
    },
    getNextStat: (c) => {
      const n = (c["timeDilation"] ?? 0) + 1;
      return `Duration: +${(n * ROGUELIKE_CONFIG.timeDilation.durationBonusPerStack * 100).toFixed(0)}%`;
    },
  },
  {
    id: "explosive",
    name: "Explosive Rounds",
    description: "Bullets deal small AOE damage on impact.",
    icon: "/powerups/icons/explosive.png",
    canStack: true, maxStacks: ROGUELIKE_CONFIG.explosive.maxStacks, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["explosive"] ?? 0;
      if (n === 0) return "Explosive: Off";
      return `Radius: ${n * ROGUELIKE_CONFIG.explosive.radiusPerStack}, Dmg: ${n * ROGUELIKE_CONFIG.explosive.damagePerStack}`;
    },
    getNextStat: (c) => {
      const n = (c["explosive"] ?? 0) + 1;
      return `Radius: ${n * ROGUELIKE_CONFIG.explosive.radiusPerStack}, Dmg: ${n * ROGUELIKE_CONFIG.explosive.damagePerStack}`;
    },
  },
  {
    id: "phoenix",
    name: "Eleventh Hour Phoenix",
    description: "Once per run, when you die, explode dealing massive damage and revive with 1 heart.",
    icon: "/powerups/icons/phoenix.png",
    canStack: false, maxStacks: 1, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => (c["phoenix"] ?? 0) > 0 ? "Phoenix: Ready" : "Phoenix: —",
    getNextStat:    () => "Phoenix: Ready",
  },
  {
    id: "chainReact",
    name: "Chain Reaction",
    description: "Bullets have a chance to arc lightning to a nearby enemy on hit.",
    icon: "/powerups/icons/chain_reaction.png",
    canStack: true, maxStacks: ROGUELIKE_CONFIG.chainReact.maxStacks, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["chainReact"] ?? 0;
      if (n === 0) return "Arc Chance: 0%";
      return `Arc Chance: ${Math.min(100, n * ROGUELIKE_CONFIG.chainReact.chancePerStack * 100).toFixed(0)}%`;
    },
    getNextStat: (c) => {
      const n = (c["chainReact"] ?? 0) + 1;
      return `Arc Chance: ${Math.min(100, n * ROGUELIKE_CONFIG.chainReact.chancePerStack * 100).toFixed(0)}%`;
    },
  },
  {
    id: "blackHole",
    name: "Black Hole",
    description: "Every 45s, a singularity pulls all enemies toward the centre and damages them.",
    icon: "/powerups/icons/black_hole.png",
    canStack: false, maxStacks: 1, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => (c["blackHole"] ?? 0) > 0 ? "Black Hole: Ready" : "Black Hole: —",
    getNextStat:    () => "Black Hole: Ready",
  },
  {
    id: "cryo",
    name: "Cryo Rounds",
    description: "Enemy bullets move slower. Each stack increases the slow duration.",
    icon: "/powerups/icons/cryo.png",
    canStack: true, maxStacks: ROGUELIKE_CONFIG.cryo.maxStacks, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["cryo"] ?? 0;
      if (n === 0) return "Slow: —";
      return `Slow Duration: ${n * ROGUELIKE_CONFIG.cryo.slowDurationPerStack}s`;
    },
    getNextStat: (c) => {
      const n = (c["cryo"] ?? 0) + 1;
      return `Slow Duration: ${n * ROGUELIKE_CONFIG.cryo.slowDurationPerStack}s`;
    },
  },
  {
    id: "pyromaniac",
    name: "Pyromaniac",
    description: "Bullets have a chance to set enemies on fire, dealing damage over time.",
    icon: "/powerups/icons/pyromaniac.png",
    canStack: true, maxStacks: ROGUELIKE_CONFIG.pyromaniac.maxStacks, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["pyromaniac"] ?? 0;
      if (n === 0) return "Burn Chance: 0%";
      return `Burn Chance: ${Math.min(100, n * ROGUELIKE_CONFIG.pyromaniac.burnChancePerStack * 100).toFixed(0)}%`;
    },
    getNextStat: (c) => {
      const n = (c["pyromaniac"] ?? 0) + 1;
      return `Burn Chance: ${Math.min(100, n * ROGUELIKE_CONFIG.pyromaniac.burnChancePerStack * 100).toFixed(0)}%`;
    },
  },
  {
    id: "takeMeHome",
    name: "Take Me Home",
    description: "Bullets gently curve toward the nearest enemy.",
    icon: "/powerups/icons/take_me_home.png",
    canStack: true, maxStacks: ROGUELIKE_CONFIG.takeMeHome.maxStacks, removeFromPoolAfterMaxed: true,
    getCurrentStat: (c) => {
      const n = c["takeMeHome"] ?? 0;
      if (n === 0) return "Homing: —";
      return `Homing: ${Math.min(100, n * ROGUELIKE_CONFIG.takeMeHome.homingStrengthPerStack * 100).toFixed(0)}%`;
    },
    getNextStat: (c) => {
      const n = (c["takeMeHome"] ?? 0) + 1;
      return `Homing: ${Math.min(100, n * ROGUELIKE_CONFIG.takeMeHome.homingStrengthPerStack * 100).toFixed(0)}%`;
    },
  },
];

// ─── Utility helpers ──────────────────────────────────────────────────────────

/** Look up a definition by ID. */
export function getPowerUp(id: string): PowerUpDefinition | undefined {
  return POWER_UP_REGISTRY.find((p) => p.id === id);
}

/** Return all IDs that are still available (not maxed, not disabled). */
export function getAvailableIds(
  chosen: PermPowerUpState,
  disabledIds: string[] = [],
  maxStacksOverrides?: Record<string, number>,
): string[] {
  const disabledSet = new Set(disabledIds);
  return POWER_UP_REGISTRY.filter((p) => {
    if (disabledSet.has(p.id)) return false;
    const stacks = chosen[p.id] ?? 0;
    const max = maxStacksOverrides?.[p.id] ?? p.maxStacks;

    // Tiered projectile system: each tier only appears when previous tier is maxed
    // and disappears permanently once a higher tier has been unlocked
    if (p.id === "projectile") {
      // Hide normal projectiles once any super tier is unlocked
      return (chosen.superProjectile ?? 0) === 0 && (chosen.superProjectile2 ?? 0) === 0 && (chosen.superProjectile3 ?? 0) === 0 && (max === -1 || stacks < max);
    }
    if (p.id === "superProjectile") {
      // Show red when projectile was maxed (for first pick) or red already unlocked (for stacks 2-3)
      const unlocked = (chosen.projectile ?? 0) >= 2 || (chosen.superProjectile ?? 0) > 0;
      return unlocked && (chosen.superProjectile2 ?? 0) === 0 && (chosen.superProjectile3 ?? 0) === 0 && (max === -1 || stacks < max);
    }
    if (p.id === "superProjectile2") {
      // Show purple when red was maxed (for first pick) or purple already unlocked
      const unlocked = (chosen.superProjectile ?? 0) >= 3 || (chosen.superProjectile2 ?? 0) > 0;
      return unlocked && (chosen.superProjectile3 ?? 0) === 0 && (max === -1 || stacks < max);
    }
    if (p.id === "superProjectile3") {
      // Show gold when purple was maxed (for first pick) or gold already unlocked
      const unlocked = (chosen.superProjectile2 ?? 0) >= 3 || (chosen.superProjectile3 ?? 0) > 0;
      return unlocked && (max === -1 || stacks < max);
    }

    return max === -1 || stacks < max;
  }).map((p) => p.id);
}

/** Pick `count` random unique IDs from the available pool. */
export function pickRandomChoices(
  chosen: PermPowerUpState,
  count = 3,
  disabledIds: string[] = [],
  maxStacksOverrides?: Record<string, number>,
): string[] {
  const available = getAvailableIds(chosen, disabledIds, maxStacksOverrides);
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
