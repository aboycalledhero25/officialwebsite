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
  const serialized = JSON.stringify(data, null, 2);
  const blob = new Blob([serialized], { type: "application/json" });

  const { error } = await supabaseAdmin.storage
    .from("config")
    .upload("data.json", blob, {
      contentType: "application/json",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to save data: ${error.message}`);
  }

  // Mirror write to local data.json so the Electron editor sees changes instantly
  try {
    const fs = await import("fs");
    const path = await import("path");
    const localPath = path.join(process.cwd(), "lib", "data.json");
    fs.writeFileSync(localPath, serialized, "utf-8");
  } catch (e) {
    // Non-fatal — local mirror is a convenience only
    console.warn("[actions] Could not write local data.json:", e);
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

// ═══════════════════════════════════════════════════════════
//  LEADERBOARD (Supabase Storage — uses config bucket)
// ═══════════════════════════════════════════════════════════

const LEADERBOARD_PATH = "leaderboard.json";

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  wave: number;
  created_at: string;
}

async function readLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabaseAdmin.storage
    .from("config")
    .download(LEADERBOARD_PATH);

  if (error) {
    // If file doesn't exist, return empty array
    if (error.message.includes("Object not found") || error.message.includes("Not Found")) {
      return [];
    }
    console.error("Failed to read leaderboard:", error);
    throw new Error("Failed to read leaderboard");
  }

  const text = await data.text();
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      // Normalize entries: ensure id, numeric score, trimmed name
      return parsed.map((entry: any, index: number) => ({
        id: entry.id || `${Date.now()}-${index}`,
        name: String(entry.name ?? "").trim(),
        score: Number(entry.score) || 0,
        wave: Number(entry.wave) || 1,
        created_at: entry.created_at || new Date().toISOString(),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

async function writeLeaderboard(entries: LeaderboardEntry[]) {
  const blob = new Blob([JSON.stringify(entries, null, 2)], {
    type: "application/json",
  });

  const { error } = await supabaseAdmin.storage
    .from("config")
    .upload(LEADERBOARD_PATH, blob, {
      contentType: "application/json",
      upsert: true,
    });

  if (error) {
    console.error("Failed to write leaderboard:", error);
    throw new Error("Failed to save leaderboard");
  }
}

const LeaderboardEntrySchema = z.object({
  name: z.string().min(1).max(20),
  score: z.number().int().min(0),
  wave: z.number().int().min(1),
});

export async function submitScore(name: string, score: number, wave: number) {
  const parsed = LeaderboardEntrySchema.safeParse({ name, score, wave });
  if (!parsed.success) {
    throw new Error("Invalid score data");
  }

  const entries = await readLeaderboard();
  const normalizedName = parsed.data.name.toLowerCase().trim();

  // Find all existing entries for this player and determine the best score
  const sameNameEntries = entries.filter((e) => e.name.toLowerCase() === normalizedName);
  const bestExisting = sameNameEntries.length > 0
    ? sameNameEntries.reduce((best, e) => (e.score > best.score ? e : best))
    : null;

  // Remove ALL entries with this name (deduplicate)
  const filtered = entries.filter((e) => e.name.toLowerCase() !== normalizedName);

  if (!bestExisting || parsed.data.score > bestExisting.score) {
    // New score is the best — add it
    filtered.push({
      id: crypto.randomUUID(),
      name: parsed.data.name.trim(),
      score: parsed.data.score,
      wave: parsed.data.wave,
      created_at: new Date().toISOString(),
    });
  } else {
    // Keep the existing best score
    filtered.push(bestExisting);
  }

  // Sort by score descending and keep top 100
  filtered.sort((a, b) => b.score - a.score);
  const trimmed = filtered.slice(0, 100);

  await writeLeaderboard(trimmed);
  revalidatePath("/");
  return { success: true };
}

export async function deleteScore(id: string) {
  await requireAuth();

  const entries = await readLeaderboard();
  const filtered = entries.filter((e) => e.id !== id);
  await writeLeaderboard(filtered);
  revalidatePath("/");
  return { success: true };
}

export async function updateScore(id: string, name: string, score: number, wave: number) {
  await requireAuth();

  const parsed = LeaderboardEntrySchema.safeParse({ name, score, wave });
  if (!parsed.success) {
    throw new Error("Invalid score data");
  }

  const entries = await readLeaderboard();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) {
    throw new Error("Score not found");
  }

  entries[idx] = {
    ...entries[idx],
    name: parsed.data.name,
    score: parsed.data.score,
    wave: parsed.data.wave,
  };

  entries.sort((a, b) => b.score - a.score);
  await writeLeaderboard(entries);
  revalidatePath("/");
  return { success: true };
}

export async function getLeaderboard(limit = 10) {
  try {
    const entries = await readLeaderboard();
    return entries.slice(0, limit);
  } catch (err) {
    console.error("Failed to fetch leaderboard:", err);
    return [];
  }
}

export async function resetLeaderboard() {
  await requireAuth();
  await writeLeaderboard([]);
  revalidatePath("/");
  return { success: true };
}
