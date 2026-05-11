// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║                    A BOY CALLED HERO — CENTRAL CONFIG                     ║
// ║  Edit via the admin dashboard at /admin or edit lib/data.json directly.  ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import rawData from "./data.json";

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

export interface SecretGameHotspot {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  unit: "%" | "px";
  visibleToVisitors: boolean;
  hoverStyle: "hidden" | "subtle" | "outline";
  tooltip: string;
  openMode: "modal";
  zIndex: number;
}

export interface SecretGameSettings {
  enabled: boolean;
  hotspot: SecretGameHotspot;
  title: string;
  instructions: string;
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
}

const typedData = rawData as SiteData;

export const bannerImage = typedData.bannerImage;
export const band = typedData.band;
export const releases = typedData.releases;
export const shows = typedData.shows;
export const merch = typedData.merch;
export const videos = typedData.videos;
export const pressFacts = typedData.pressFacts;
export const siteMeta = typedData.siteMeta;
export const newsItems = typedData.newsItems;
export const forFansOf = typedData.forFansOf;
export const instagramHandle = typedData.instagramHandle;
export const instagramPosts = typedData.instagramPosts;

// Re-export full data for admin API
export default typedData;
