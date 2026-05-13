// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║                    A BOY CALLED HERO — CENTRAL TYPES                      ║
// ║  Data is stored in Supabase Storage (config/data.json).                  ║
// ║  Use lib/data-server.ts for server-side reads.                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

export interface BandMember {
  name: string;
  role: string;
}

export interface BandBio {
  elevator: string;
  short: string;
  medium: string;
  long: string;
}

export interface BandSocial {
  instagram: string;
  twitter: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  spotify: string;
  appleMusic: string;
  bandcamp: string;
}

export interface BandContact {
  booking: string;
  press: string;
  general: string;
}

export interface Band {
  name: string;
  tagline: string;
  genre: string;
  location: string;
  formed: string;
  members: BandMember[];
  bio: BandBio;
  social: BandSocial;
  contact: BandContact;
}

export interface Release {
  id: string;
  title: string;
  type: string;
  releaseDate: string;
  artwork: string;
  description: string;
  spotifyUrl: string;
  appleMusicUrl: string;
  youtubeUrl: string;
  bandcampUrl: string;
  embedUrl: string;
  lyrics: string;
  meaning: string;
}

export interface Show {
  id: string;
  date: string;
  venue: string;
  city: string;
  country: string;
  ticketUrl: string | null;
  status: "upcoming" | "past";
  supporting: string;
}

export interface MerchItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  variants: string[];
  description: string;
  handle: string;
}

export interface Video {
  id: string;
  title: string;
  youtubeId: string;
  type: "music-video" | "live" | "behind-the-scenes";
  description: string;
}

export interface PressFact {
  label: string;
  value: string;
}

export interface SiteMeta {
  title: string;
  description: string;
  url: string;
  image: string;
  twitterHandle: string;
}

export interface NewsItem {
  date: string;
  title: string;
  body: string;
}

export interface InstagramPost {
  id: string;
  image: string;
  url: string;
  caption: string;
}

export interface AboutImage {
  src: string;
  alt: string;
  span?: "square" | "wide" | "tall" | "large";
}

export interface PlayerSprite {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/** A single point in the player's polygon hitbox, relative to playerX/Y in game-logical units. */
export interface HitboxPoint {
  x: number;
  y: number;
}

/**
 * Configurable player collision hitbox.
 *
 * When `points` contains ≥ 3 entries the game uses polygon (ray-cast) collision.
 * Otherwise falls back to the legacy AABB rectangle (offsetX/Y + width/height).
 * Points are in game-logical units, relative to playerX / playerY.
 */
export interface PlayerHitbox {
  /** Legacy rectangle fields — used as fallback when no polygon is defined. */
  offsetX?: number;
  offsetY?: number;
  width?: number;
  height?: number;
  /** Polygon vertices (relative to playerX, playerY). When ≥ 3 points are present,
   *  polygon collision is used and the rectangle fields above are ignored. */
  points?: HitboxPoint[];
}

export interface GameEnemySettings {
  speed: number;
  fireRate: number;
  projectileSpeed: number;
  projectileSize: number;
  columns: number;
  rows: number;
  startY: number;
  offsetX: number;
  paddingX: number;
  paddingY: number;
  dropDistance: number;
  /** Grid cell size — controls spacing, collision, and shooting origin */
  width: number;
  height: number;
  /**
   * Optional hitbox adjustment for bullet-vs-enemy collision.
   * The hitbox is centred on the grid cell by default (width × height).
   * Use these to shrink the hitbox so large sprites don't feel unfair.
   */
  hitboxOffsetX?: number; // pixels from cell left edge (can be negative)
  hitboxOffsetY?: number; // pixels from cell top  edge (can be negative)
  hitboxWidth?: number;   // hitbox width  in game units; defaults to cell width
  hitboxHeight?: number;  // hitbox height in game units; defaults to cell height
  /**
   * Visual-only scale multiplier for the enemy sprite.
   * Does NOT affect the grid cell size or collision box.
   * 1 = sprite fills the cell, 2 = sprite is twice as large, etc.
   * Default: 1
   */
  spriteScale?: number;
}

export interface GameUIElement {
  visible: boolean;
  x: number;
  y: number;
  size?: number;
}

export interface GameHeartsSettings extends GameUIElement {
  size: number;
}

export interface GameArrowKeysSettings extends GameUIElement {
  size: number;
}

export interface GameTouchAreaSettings {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameFireButtonSettings extends GameUIElement {
  size: number;
}

export interface GameShieldSettings {
  offsetX: number;
  offsetY: number;
  radius: number;
}

export interface GamePlatformSettings {
  player: { x: number; y: number };
  hearts: GameHeartsSettings;
  arrowKeys: GameArrowKeysSettings;
  touchArea: GameTouchAreaSettings;
  fireButton: GameFireButtonSettings;
  score: GameUIElement;
  wave: GameUIElement;
  powerUps: GameUIElement;
  shield: GameShieldSettings;
  enemy: GameEnemySettings;
  bossHealthBar: GameUIElement;
  boss: { x: number; y: number };
}

export interface BossSettings {
  enabled: boolean;
  interval: number;
  baseHealth: number;
  healthIncrease: number;
  bulletDamage: number;
  projectileSpeed: number;
  projectileSize: number;
  fireInterval: number;
  trackSpeed: number;
  width: number;
  height: number;
  scoreReward: number;
}

/** Configurable sizes for GIF impact effects (in game coordinate units, 240×320 space) */
export interface GameImpactSettings {
  /** Size of the bullet GIF when the player's bullet lands on an enemy / boss */
  playerBullet: { w: number; h: number };
  /** Size of the bullet GIF when an enemy bullet hits the player */
  enemyBullet: { w: number; h: number };
  /** Size of the lightning strike GIF */
  lightning?: { w: number; h: number };
  /** Size of the bomb explosion GIF */
  bomb?: { w: number; h: number };
  /** Size of the boss death explosion GIF */
  boss?: { w: number; h: number };
  /** Size of the nuke explosion GIF */
  nuke?: { w: number; h: number };
  /** Size of the virus infection GIF */
  virus?: { w: number; h: number };
}

/** Per-type drop-rate weights for standard temp power-ups.
 *  Each value is the relative spawn probability for that type.
 *  They are normalised automatically — you do NOT need them to sum to 1. */
export interface GamePowerUpDropRates {
  rapid: number;
  wideshot: number;
  extralife: number;
  invincible: number;
}

export interface SecretGameSettings {
  enabled: boolean;
  title: string;
  instructions: string;
  playerSprite: PlayerSprite;
  powerUpSpawnChance: number;
  bossProjectileDropRate: number;
  powerUpSize: number;
  powerUpDurations: {
    rapid: number;
    wideShot: number;
    invincible: number;
  };
  /** Base enemy HP at wave 1 (default 1 = one-hit kill) */
  enemyBaseHp: number;
  /** Extra HP added to enemies for each wave beyond wave 1 (default 0) */
  enemyHpPerWave: number;
  /** Slices of health removed when an enemy body contacts the player (default 1) */
  enemyCollisionDamage?: number;
  /** Extra collision damage slices added per wave beyond wave 1 (default 0) */
  enemyCollisionDamagePerWave?: number;
  /** Slices of health removed by a single enemy bullet hit (default 1) */
  enemyProjectileDamage?: number;
  /** Extra bullet damage slices added per wave beyond wave 1 (default 0) */
  enemyProjectileDamagePerWave?: number;
  /** Extra enemy projectile speed added per wave beyond wave 1 (default 0) */
  enemyProjectileSpeedPerWave?: number;
  /** Configurable GIF sizes for hit/death impacts */
  impacts: GameImpactSettings;
  /** Per-type relative spawn rates for standard temp power-ups */
  powerUpDropRates: GamePowerUpDropRates;
  /** Show the permanent power-up selection screen after every wave (not just boss waves) */
  waveRewardEnabled: boolean;
  /** Chance (0–1) that a killed enemy drops a golden "Choose a Power-Up" pickup */
  enemyChoiceDropChance: number;
  /**
   * IDs of permanent power-ups to exclude from the selection pool.
   * Any power-up whose `id` appears here will never be offered to the player.
   * Useful for testing individual power-ups in isolation.
   * e.g. ["bomb", "virus"]
   */
  disabledPowerUps?: string[];
  /**
   * Player collision hitbox. Offset is relative to the player's game position (playerX/Y).
   * Defaults to { offsetX: 0, offsetY: 0, width: 10, height: 20 }.
   */
  playerHitbox?: PlayerHitbox;
  /**
   * Where the player's bullets spawn, as an offset from playerX / playerY in game-logical units.
   * Defaults to { x: PLAYER_W_BASE/2, y: PLAYER_H_BASE/2 } (centre of the hitbox).
   */
  bulletSpawnOffsetX?: number;
  bulletSpawnOffsetY?: number;
  /**
   * Permanent shield bubble appearance. The offset is relative to the player sprite centre.
   * Defaults to { offsetX: 0, offsetY: 0, radius: 20 }.
   */
  permShield?: GameShieldSettings;
  /**
   * Optional overrides for roguelike power-up balance values.
   * Any field provided here takes precedence over the hardcoded ROGUELIKE_CONFIG defaults.
   * Omit a field to keep the default value.
   */
  roguelikeConfig?: {
    startingHearts?: number;
    baseReloadTime?: number;
    baseMovementSpeed?: number;
    baseBulletDamage?: number;
    baseEnemyDropChance?: number;
    reloadEnabled?: boolean;
    reload?: { maxShots?: number; reloadDuration?: number };
    fastReload?: { reductionPerStack?: number; minReloadTime?: number };
    rapidFire?: { ratePerStack?: number; minCooldown?: number };
    machineGun?: { baseBurst?: number; burstPerStack?: number; burstSpread?: number; burstDelay?: number };
    frenzy?: { cooldown?: number; damage?: number; baseProjectiles?: number; projectilesPerStack?: number };
    bomb?: { cooldown?: number; damage?: number; bombsPerStack?: number; crossRadius?: number };
    lightning?: { cooldown?: number; damage?: number; baseStrikes?: number; strikesPerStack?: number };
    connect?: { damage?: number; damagePerStack?: number };
    seeker?: { missileDamage?: number; missileCooldown?: number; missilesPerStack?: number };
    orbital?: { damage?: number; orbitSpeed?: number; orbSize?: number; cooldown?: number; orbitRadius?: number; duration?: number };
    virus?: { baseInfectionChance?: number; chancePerStack?: number; baseDamagePerTick?: number; damagePerStack?: number; duration?: number; maxVirusStacks?: number };
    nuke?: { cooldown?: number; bossHPReduction?: number; nukesPerStack?: number };
    speed?: { speedPerStack?: number };
    strength?: { damagePerStack?: number };
    projectile?: { projectilesPerStack?: number; superBulletThreshold?: number; superBulletSizeMultiplier?: number };
    luck?: { dropChancePerStack?: number };
    extraLife?: { heartsPerStack?: number };
    shield?: { duration?: number; cooldown?: number };
  };
  /**
   * Per-wave enemy overrides. Specify custom projectile speed, projectile damage (enemy-to-player),
   * and enemy body collision damage for specific waves.
   */
  waveOverrides?: Array<{
    wave: number;
    projSpeed?: number;
    projDamage?: number;
    enemyCollisionDamage?: number;
  }>;
  boss: BossSettings;
  /**
   * Per-boss HP overrides. Index 0 = Boss 1 (first boss encounter), index 1 = Boss 2, etc.
   * When provided, overrides the formula-based HP (baseHealth + (bossNumber-1) * healthIncrease).
   * Leave entries undefined/missing to fall back to the formula for that boss.
   */
  bossHealthPerWaveGroup?: number[];
  /**
   * Per-sound-effect volume multipliers (0.0 – 2.0), applied on top of the player's master SFX volume.
   * Keys: shoot, enemyHit, playerHit, gameOver, levelComplete, bomb, lightning, powerup, connect, shield
   * Omitting a key defaults to 1.0 (no change).
   */
  sfxVolumes?: Record<string, number>;
  desktop: GamePlatformSettings;
  mobile: GamePlatformSettings;
}

export interface PageVisibility {
  home: boolean;
  music: boolean;
  merch: boolean;
  shows: boolean;
  about: boolean;
  media: boolean;
  press: boolean;
  contact: boolean;
  live: boolean;
}

export interface SiteCopy {
  nav: Record<string, string>;
  footer: Record<string, string>;
  home: Record<string, any>;
  about: Record<string, any>;
  music: Record<string, any>;
  merch: Record<string, any>;
  shows: Record<string, any>;
  media: Record<string, any>;
  press: Record<string, any>;
  contact: Record<string, any>;
  live: Record<string, any>;
  showCard: Record<string, string>;
  merchCard: Record<string, string>;
  streamingLinks: Record<string, string>;
}

export interface GuitarColors {
  stratColor: string;
  jaguarColor: string;
}

export interface SiteData {
  bannerImage: string;
  siteCopy: SiteCopy;
  band: Band;
  releases: Release[];
  shows: Show[];
  merch: MerchItem[];
  videos: Video[];
  pressFacts: PressFact[];
  siteMeta: SiteMeta;
  newsItems: NewsItem[];
  forFansOf: string;
  instagramHandle: string;
  instagramToken: string;
  instagramBusinessAccountId: string;
  facebookPageId: string;
  facebookAppId: string;
  instagramEmbedCode: string;
  twitchUsername: string;
  instagramLastFetched: string;
  instagramPosts: InstagramPost[];
  aboutImages: AboutImage[];
  secretGame: SecretGameSettings;
  pageVisibility: PageVisibility;
  guitarColors: GuitarColors;
}
