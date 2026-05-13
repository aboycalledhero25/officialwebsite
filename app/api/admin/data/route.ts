import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { join } from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LOCAL_DATA_PATH = join(process.cwd(), "lib", "data.json");

/** Read local data.json synchronously — used as fallback in both GET and POST */
function readLocalJson(): Record<string, unknown> | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    return JSON.parse(fs.readFileSync(LOCAL_DATA_PATH, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * In-memory cache — set only when a POST (save) comes in from the admin panel.
 * NOT seeded from disk on startup: on Vercel each serverless container loads the
 * baked-in data.json from the last *deploy*, not the latest Supabase data. Seeding
 * from disk would make every fresh container serve 60 s of stale settings.
 * TTL is 30 s; after that GET falls back to Supabase to pick up any newer data.
 */
let memCache: { data: Record<string, unknown>; ts: number } | null = null;
const MEM_CACHE_TTL_MS = 30_000;

/** Write data to local data.json — keeps local file in sync with Supabase */
function writeLocalJson(data: unknown): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    fs.writeFileSync(LOCAL_DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("[api/data] Could not write local data.json:", e);
  }
}

export async function GET() {
  // ── 1. Serve from in-memory cache if fresh (editor just saved) ──────────
  if (memCache && Date.now() - memCache.ts < MEM_CACHE_TTL_MS) {
    return NextResponse.json(memCache.data);
  }

  // ── 2. Fetch from Supabase ───────────────────────────────────────────────
  try {
    const { data, error } = await supabaseAdmin.storage
      .from("config")
      .download("data.json");

    if (error) {
      // Fall back to local file (mirrors data-server.ts behaviour)
      const local = readLocalJson();
      if (local) return NextResponse.json(local);
      throw error;
    }

    const text = await data.text();
    const json = JSON.parse(text);
    return NextResponse.json(json);
  } catch (error) {
    console.error("Failed to read data from Supabase:", error);
    // Last-resort: try local file
    const local = readLocalJson();
    if (local) return NextResponse.json(local);
    return NextResponse.json(
      { error: "Failed to read data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── Update in-memory cache immediately so the next GET poll is instant ──
    memCache = { data: body as Record<string, unknown>, ts: Date.now() };

    const serialized = JSON.stringify(body, null, 2);
    const blob = new Blob([serialized], { type: "application/json" });

    const { error } = await supabaseAdmin.storage
      .from("config")
      .upload("data.json", blob, {
        contentType: "application/json",
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Mirror the write to the local file so the editor sees changes immediately
    writeLocalJson(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to write data to Supabase:", error);
    return NextResponse.json(
      { error: "Failed to save data" },
      { status: 500 }
    );
  }
}
