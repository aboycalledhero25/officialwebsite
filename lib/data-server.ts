import "server-only";

import fs from "fs";
import path from "path";
import type {
  Band,
  Release,
  Show,
  MerchItem,
  Video,
  PressFact,
  SiteMeta,
  NewsItem,
  InstagramPost,
  SiteData,
  AboutImage,
} from "./data";

const dataPath = path.join(process.cwd(), "lib", "data.json");

export function getData(): SiteData {
  const raw = fs.readFileSync(dataPath, "utf-8");
  return JSON.parse(raw);
}

export function getBannerImage(): string {
  return getData().bannerImage;
}

export function getSiteCopy(): any {
  return getData().siteCopy;
}

export function getBand(): Band {
  return getData().band;
}

export function getReleases(): Release[] {
  return getData().releases;
}

export function getShows(): Show[] {
  return getData().shows;
}

export function getMerch(): MerchItem[] {
  return getData().merch;
}

export function getVideos(): Video[] {
  return getData().videos;
}

export function getPressFacts(): PressFact[] {
  return getData().pressFacts;
}

export function getSiteMeta(): SiteMeta {
  return getData().siteMeta;
}

export function getNewsItems(): NewsItem[] {
  return getData().newsItems;
}

export function getForFansOf(): string {
  return getData().forFansOf;
}

export function getInstagramHandle(): string {
  return getData().instagramHandle;
}

export function getInstagramToken(): string {
  return getData().instagramToken;
}

export function getInstagramLastFetched(): string {
  return getData().instagramLastFetched;
}

export function getInstagramPosts(): InstagramPost[] {
  return getData().instagramPosts;
}

export function getTwitchUsername(): string {
  return getData().twitchUsername;
}

export function getAboutImages(): AboutImage[] {
  return getData().aboutImages ?? [];
}

export function getPageVisibility() {
  return getData().pageVisibility ?? {
    home: true,
    music: true,
    merch: true,
    shows: true,
    about: true,
    media: true,
    press: true,
    contact: true,
    live: true,
  };
}

export function getGuitarColors() {
  return getData().guitarColors ?? {
    stratColor: "#00f0ff",
    jaguarColor: "#ff006e",
  };
}
