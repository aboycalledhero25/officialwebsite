"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function readData(): Promise<any> {
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

async function writeData(data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const { error } = await supabaseAdmin.storage
    .from("config")
    .upload("data.json", blob, {
      contentType: "application/json",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to save data: ${error.message}`);
  }
}

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/music");
  revalidatePath("/merch");
  revalidatePath("/shows");
  revalidatePath("/media");
  revalidatePath("/press");
  revalidatePath("/contact");
  revalidatePath("/live");
}

// ═══════════════════════════════════════════════════════════
//  BAND
// ═══════════════════════════════════════════════════════════

export async function updateBand(formData: FormData) {
  await requireAuth();
  
  const data = await readData();
  data.band = {
    name: formData.get("name") as string,
    tagline: formData.get("tagline") as string,
    genre: formData.get("genre") as string,
    location: formData.get("location") as string,
    formed: formData.get("formed") as string,
    members: JSON.parse(formData.get("members") as string || "[]"),
    bio: {
      elevator: formData.get("bio.elevator") as string,
      short: formData.get("bio.short") as string,
      medium: formData.get("bio.medium") as string,
      long: formData.get("bio.long") as string,
    },
    social: JSON.parse(formData.get("social") as string || "{}"),
    contact: {
      booking: formData.get("contact.booking") as string,
      press: formData.get("contact.press") as string,
      general: formData.get("contact.general") as string,
    },
  };
  
  await writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  RELEASES
// ═══════════════════════════════════════════════════════════

export async function updateReleases(releases: any[]) {
  await requireAuth();
  
  const data = await readData();
  data.releases = releases;
  await writeData(data);
  revalidateAll();
  return { success: true };
}

export async function addRelease(release: any) {
  await requireAuth();
  
  const data = await readData();
  data.releases.push(release);
  await writeData(data);
  revalidateAll();
  return { success: true };
}

export async function deleteRelease(id: string) {
  await requireAuth();
  
  const data = await readData();
  data.releases = data.releases.filter((r: any) => r.id !== id);
  await writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  SHOWS
// ═══════════════════════════════════════════════════════════

export async function updateShows(shows: any[]) {
  await requireAuth();
  
  const data = await readData();
  data.shows = shows;
  await writeData(data);
  revalidateAll();
  return { success: true };
}

export async function addShow(show: any) {
  await requireAuth();
  
  const data = await readData();
  data.shows.push(show);
  await writeData(data);
  revalidateAll();
  return { success: true };
}

export async function deleteShow(id: string) {
  await requireAuth();
  
  const data = await readData();
  data.shows = data.shows.filter((s: any) => s.id !== id);
  await writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  MERCH
// ═══════════════════════════════════════════════════════════

export async function updateMerch(merch: any[]) {
  await requireAuth();
  
  const data = await readData();
  data.merch = merch;
  await writeData(data);
  revalidateAll();
  return { success: true };
}

export async function addMerchItem(item: any) {
  await requireAuth();
  
  const data = await readData();
  data.merch.push(item);
  await writeData(data);
  revalidateAll();
  return { success: true };
}

export async function deleteMerchItem(id: string) {
  await requireAuth();
  
  const data = await readData();
  data.merch = data.merch.filter((m: any) => m.id !== id);
  await writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  VIDEOS
// ═══════════════════════════════════════════════════════════

export async function updateVideos(videos: any[]) {
  await requireAuth();
  
  const data = await readData();
  data.videos = videos;
  await writeData(data);
  revalidateAll();
  return { success: true };
}

export async function addVideo(video: any) {
  await requireAuth();
  
  const data = await readData();
  data.videos.push(video);
  await writeData(data);
  revalidateAll();
  return { success: true };
}

export async function deleteVideo(id: string) {
  await requireAuth();
  
  const data = await readData();
  data.videos = data.videos.filter((v: any) => v.id !== id);
  await writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  PRESS FACTS
// ═══════════════════════════════════════════════════════════

export async function updatePressFacts(facts: any[]) {
  await requireAuth();
  
  const data = await readData();
  data.pressFacts = facts;
  await writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  NEWS
// ═══════════════════════════════════════════════════════════

export async function updateNewsItems(items: any[]) {
  await requireAuth();
  
  const data = await readData();
  data.newsItems = items;
  await writeData(data);
  revalidateAll();
  return { success: true };
}

export async function addNewsItem(item: any) {
  await requireAuth();
  
  const data = await readData();
  data.newsItems.push(item);
  await writeData(data);
  revalidateAll();
  return { success: true };
}

export async function deleteNewsItem(id: string) {
  await requireAuth();
  
  const data = await readData();
  data.newsItems = data.newsItems.filter((n: any) => n.id !== id);
  await writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  ABOUT IMAGES
// ═══════════════════════════════════════════════════════════

export async function updateAboutImages(images: any[]) {
  await requireAuth();
  
  const data = await readData();
  data.aboutImages = images;
  await writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  SITE META
// ═══════════════════════════════════════════════════════════

export async function updateSiteMeta(meta: any) {
  await requireAuth();
  
  const data = await readData();
  data.siteMeta = meta;
  await writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  SITE COPY
// ═══════════════════════════════════════════════════════════

export async function updateSiteCopy(siteCopy: any) {
  await requireAuth();
  
  const data = await readData();
  data.siteCopy = siteCopy;
  await writeData(data);
  revalidateAll();
  return { success: true };
}

export async function updateSiteCopyPath(path: string, value: any) {
  await requireAuth();
  
  const data = await readData();
  const keys = path.split(".");
  let target = data.siteCopy;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!target[keys[i]]) target[keys[i]] = {};
    target = target[keys[i]];
  }
  
  target[keys[keys.length - 1]] = value;
  await writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  BANNER IMAGE
// ═══════════════════════════════════════════════════════════

export async function updateBannerImage(imagePath: string) {
  await requireAuth();
  
  const data = await readData();
  data.bannerImage = imagePath;
  await writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  INSTAGRAM / SOCIAL CONFIG
// ═══════════════════════════════════════════════════════════

export async function updateSocialConfig(config: any) {
  await requireAuth();
  
  const data = await readData();
  Object.assign(data, config);
  await writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  IMAGE UPLOAD / DELETE
// ═══════════════════════════════════════════════════════════

export async function uploadImage(formData: FormData) {
  await requireAuth();

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: JPG, PNG, WebP, GIF, SVG");
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error("File too large. Max 10MB.");
  }

  const safeName = file.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/-+/g, "-");

  const uniqueName = `${Date.now()}-${safeName}`;

  const { error } = await supabaseAdmin.storage
    .from("website-images")
    .upload(uniqueName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: publicUrl } = supabaseAdmin.storage
    .from("website-images")
    .getPublicUrl(uniqueName);

  return { path: publicUrl.publicUrl };
}

export async function deleteImage(filename: string) {
  await requireAuth();

  // Extract just the filename from a full URL or path
  const safeName = filename.split("/").pop() || filename;

  const { error } = await supabaseAdmin.storage
    .from("website-images")
    .remove([safeName]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }

  return { success: true };
}

export async function listImages() {
  await requireAuth();

  const { data, error } = await supabaseAdmin.storage
    .from("website-images")
    .list();

  if (error || !data) return [];

  return data
    .filter((f) => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f.name))
    .map((f) => {
      const { data: url } = supabaseAdmin.storage
        .from("website-images")
        .getPublicUrl(f.name);
      return {
        name: f.name,
        path: url.publicUrl,
        size: f.metadata?.size ?? 0,
      };
    });
}

// ═══════════════════════════════════════════════════════════
//  SINGLE-FIELD UPDATES (for inline editing)
// ═══════════════════════════════════════════════════════════

export async function updateBandField(field: string, value: string) {
  await requireAuth();

  const data = await readData();
  const keys = field.split(".");
  let target: any = data.band;

  for (let i = 0; i < keys.length - 1; i++) {
    target = target[keys[i]];
  }

  target[keys[keys.length - 1]] = value;
  await writeData(data);
  revalidateAll();
  return { success: true };
}

export async function updateReleaseField(id: string, field: string, value: string) {
  await requireAuth();

  const data = await readData();
  data.releases = data.releases.map((r: any) =>
    r.id === id ? { ...r, [field]: value } : r
  );
  await writeData(data);
  revalidateAll();
  return { success: true };
}

export async function updateAboutImageField(index: number, field: string, value: string) {
  await requireAuth();

  const data = await readData();
  if (data.aboutImages[index]) {
    data.aboutImages[index] = { ...data.aboutImages[index], [field]: value };
  }
  await writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  SECRET GAME
// ═══════════════════════════════════════════════════════════

export async function updateSecretGameSettings(settings: any) {
  await requireAuth();

  const data = await readData();
  data.secretGame = settings;
  await writeData(data);
  revalidateAll();
  return { success: true };
}

export async function updatePageVisibility(visibility: any) {
  await requireAuth();

  const data = await readData();
  data.pageVisibility = visibility;
  await writeData(data);
  revalidateAll();
  return { success: true };
}
