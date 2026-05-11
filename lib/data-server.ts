import "server-only";

import { createClient } from "@supabase/supabase-js";
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function getData(): Promise<SiteData> {
  const { data, error } = await supabaseAdmin.storage
    .from("config")
    .download("data.json");

  if (error) {
    // Fallback to local file if Supabase not initialized yet
    const fs = await import("fs");
    const path = await import("path");
    const localPath = path.join(process.cwd(), "lib", "data.json");
    const raw = fs.readFileSync(localPath, "utf-8");
    return JSON.parse(raw);
  }

  const text = await data.text();
  return JSON.parse(text);
}

export async function getBannerImage(): Promise<string> {
  return (await getData()).bannerImage;
}

export async function getSiteCopy(): Promise<any> {
  return (await getData()).siteCopy;
}

export async function getBand(): Promise<Band> {
  return (await getData()).band;
}

export async function getReleases(): Promise<Release[]> {
  return (await getData()).releases;
}

export async function getShows(): Promise<Show[]> {
  return (await getData()).shows;
}

export async function getMerch(): Promise<MerchItem[]> {
  return (await getData()).merch;
}

export async function getVideos(): Promise<Video[]> {
  return (await getData()).videos;
}

export async function getPressFacts(): Promise<PressFact[]> {
  return (await getData()).pressFacts;
}

export async function getSiteMeta(): Promise<SiteMeta> {
  return (await getData()).siteMeta;
}

export async function getNewsItems(): Promise<NewsItem[]> {
  return (await getData()).newsItems;
}

export async function getForFansOf(): Promise<string> {
  return (await getData()).forFansOf;
}

export async function getInstagramHandle(): Promise<string> {
  return (await getData()).instagramHandle;
}

export async function getInstagramToken(): Promise<string> {
  return (await getData()).instagramToken;
}

export async function getInstagramLastFetched(): Promise<string> {
  return (await getData()).instagramLastFetched;
}

export async function getInstagramPosts(): Promise<InstagramPost[]> {
  return (await getData()).instagramPosts;
}

export async function getTwitchUsername(): Promise<string> {
  return (await getData()).twitchUsername;
}

export async function getAboutImages(): Promise<AboutImage[]> {
  return (await getData()).aboutImages ?? [];
}

export async function getPageVisibility() {
  return (await getData()).pageVisibility ?? {
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

export async function getGuitarColors() {
  return (await getData()).guitarColors ?? {
    stratColor: "#00f0ff",
    jaguarColor: "#ff006e",
  };
}
