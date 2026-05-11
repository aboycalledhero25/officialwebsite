"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { z } from "zod";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "lib", "data.json");
const BACKUP_DIR = path.join(process.cwd(), "lib", "backups");

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function readData(): any {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeData(data: any) {
  ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUP_DIR, `data-${timestamp}.json`);
  
  // Backup current file
  if (fs.existsSync(DATA_PATH)) {
    fs.copyFileSync(DATA_PATH, backupPath);
  }
  
  // Write new data
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
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
  
  const data = readData();
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
  
  writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  RELEASES
// ═══════════════════════════════════════════════════════════

export async function updateReleases(releases: any[]) {
  await requireAuth();
  
  const data = readData();
  data.releases = releases;
  writeData(data);
  revalidateAll();
  return { success: true };
}

export async function addRelease(release: any) {
  await requireAuth();
  
  const data = readData();
  data.releases.push(release);
  writeData(data);
  revalidateAll();
  return { success: true };
}

export async function deleteRelease(id: string) {
  await requireAuth();
  
  const data = readData();
  data.releases = data.releases.filter((r: any) => r.id !== id);
  writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  SHOWS
// ═══════════════════════════════════════════════════════════

export async function updateShows(shows: any[]) {
  await requireAuth();
  
  const data = readData();
  data.shows = shows;
  writeData(data);
  revalidateAll();
  return { success: true };
}

export async function addShow(show: any) {
  await requireAuth();
  
  const data = readData();
  data.shows.push(show);
  writeData(data);
  revalidateAll();
  return { success: true };
}

export async function deleteShow(id: string) {
  await requireAuth();
  
  const data = readData();
  data.shows = data.shows.filter((s: any) => s.id !== id);
  writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  MERCH
// ═══════════════════════════════════════════════════════════

export async function updateMerch(merch: any[]) {
  await requireAuth();
  
  const data = readData();
  data.merch = merch;
  writeData(data);
  revalidateAll();
  return { success: true };
}

export async function addMerchItem(item: any) {
  await requireAuth();
  
  const data = readData();
  data.merch.push(item);
  writeData(data);
  revalidateAll();
  return { success: true };
}

export async function deleteMerchItem(id: string) {
  await requireAuth();
  
  const data = readData();
  data.merch = data.merch.filter((m: any) => m.id !== id);
  writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  VIDEOS
// ═══════════════════════════════════════════════════════════

export async function updateVideos(videos: any[]) {
  await requireAuth();
  
  const data = readData();
  data.videos = videos;
  writeData(data);
  revalidateAll();
  return { success: true };
}

export async function addVideo(video: any) {
  await requireAuth();
  
  const data = readData();
  data.videos.push(video);
  writeData(data);
  revalidateAll();
  return { success: true };
}

export async function deleteVideo(id: string) {
  await requireAuth();
  
  const data = readData();
  data.videos = data.videos.filter((v: any) => v.id !== id);
  writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  PRESS FACTS
// ═══════════════════════════════════════════════════════════

export async function updatePressFacts(facts: any[]) {
  await requireAuth();
  
  const data = readData();
  data.pressFacts = facts;
  writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  NEWS
// ═══════════════════════════════════════════════════════════

export async function updateNewsItems(items: any[]) {
  await requireAuth();
  
  const data = readData();
  data.newsItems = items;
  writeData(data);
  revalidateAll();
  return { success: true };
}

export async function addNewsItem(item: any) {
  await requireAuth();
  
  const data = readData();
  data.newsItems.push(item);
  writeData(data);
  revalidateAll();
  return { success: true };
}

export async function deleteNewsItem(id: string) {
  await requireAuth();
  
  const data = readData();
  data.newsItems = data.newsItems.filter((n: any) => n.id !== id);
  writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  ABOUT IMAGES
// ═══════════════════════════════════════════════════════════

export async function updateAboutImages(images: any[]) {
  await requireAuth();
  
  const data = readData();
  data.aboutImages = images;
  writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  SITE META
// ═══════════════════════════════════════════════════════════

export async function updateSiteMeta(meta: any) {
  await requireAuth();
  
  const data = readData();
  data.siteMeta = meta;
  writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  SITE COPY
// ═══════════════════════════════════════════════════════════

export async function updateSiteCopy(siteCopy: any) {
  await requireAuth();
  
  const data = readData();
  data.siteCopy = siteCopy;
  writeData(data);
  revalidateAll();
  return { success: true };
}

export async function updateSiteCopyPath(path: string, value: any) {
  await requireAuth();
  
  const data = readData();
  const keys = path.split(".");
  let target = data.siteCopy;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!target[keys[i]]) target[keys[i]] = {};
    target = target[keys[i]];
  }
  
  target[keys[keys.length - 1]] = value;
  writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  BANNER IMAGE
// ═══════════════════════════════════════════════════════════

export async function updateBannerImage(imagePath: string) {
  await requireAuth();
  
  const data = readData();
  data.bannerImage = imagePath;
  writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  INSTAGRAM / SOCIAL CONFIG
// ═══════════════════════════════════════════════════════════

export async function updateSocialConfig(config: any) {
  await requireAuth();
  
  const data = readData();
  Object.assign(data, config);
  writeData(data);
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
  const uploadDir = path.join(process.cwd(), "public", "images");
  const filePath = path.join(uploadDir, uniqueName);
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  
  return { path: `/images/${uniqueName}` };
}

export async function deleteImage(filename: string) {
  await requireAuth();
  
  // Prevent directory traversal
  const safeName = path.basename(filename);
  const filePath = path.join(process.cwd(), "public", "images", safeName);
  
  // Ensure it's within the images directory
  const resolvedPath = path.resolve(filePath);
  const imagesDir = path.resolve(path.join(process.cwd(), "public", "images"));
  if (!resolvedPath.startsWith(imagesDir)) {
    throw new Error("Invalid file path");
  }
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  
  return { success: true };
}

export async function listImages() {
  await requireAuth();
  
  const imagesDir = path.join(process.cwd(), "public", "images");
  if (!fs.existsSync(imagesDir)) return [];
  
  const files = fs.readdirSync(imagesDir);
  return files
    .filter((f) => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f))
    .map((f) => ({
      name: f,
      path: `/images/${f}`,
      size: fs.statSync(path.join(imagesDir, f)).size,
    }));
}

// ═══════════════════════════════════════════════════════════
//  SINGLE-FIELD UPDATES (for inline editing)
// ═══════════════════════════════════════════════════════════

export async function updateBandField(field: string, value: string) {
  await requireAuth();

  const data = readData();
  const keys = field.split(".");
  let target: any = data.band;

  for (let i = 0; i < keys.length - 1; i++) {
    target = target[keys[i]];
  }

  target[keys[keys.length - 1]] = value;
  writeData(data);
  revalidateAll();
  return { success: true };
}

export async function updateReleaseField(id: string, field: string, value: string) {
  await requireAuth();

  const data = readData();
  data.releases = data.releases.map((r: any) =>
    r.id === id ? { ...r, [field]: value } : r
  );
  writeData(data);
  revalidateAll();
  return { success: true };
}

export async function updateAboutImageField(index: number, field: string, value: string) {
  await requireAuth();

  const data = readData();
  if (data.aboutImages[index]) {
    data.aboutImages[index] = { ...data.aboutImages[index], [field]: value };
  }
  writeData(data);
  revalidateAll();
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  SECRET GAME
// ═══════════════════════════════════════════════════════════

export async function updateSecretGameSettings(settings: any) {
  await requireAuth();

  const data = readData();
  data.secretGame = settings;
  writeData(data);
  revalidateAll();
  return { success: true };
}

export async function updatePageVisibility(visibility: any) {
  await requireAuth();

  const data = readData();
  data.pageVisibility = visibility;
  writeData(data);
  revalidateAll();
  return { success: true };
}
