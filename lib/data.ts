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

export interface GameEnemySettings {
  speed: number;
  fireRate: number;
  projectileSpeed: number;
  columns: number;
  rows: number;
  startY: number;
  paddingX: number;
  paddingY: number;
  dropDistance: number;
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
}

export interface SecretGameSettings {
  enabled: boolean;
  title: string;
  instructions: string;
  playerSprite: PlayerSprite;
  powerUpSpawnChance: number;
  powerUpSize: number;
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
