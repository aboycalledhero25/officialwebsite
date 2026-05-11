import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const imagesDir = path.join(process.cwd(), "public", "images");
    await fs.mkdir(imagesDir, { recursive: true });
    const files = await fs.readdir(imagesDir);
    const images = files.filter(
      (f) => !f.startsWith(".") && f.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
    );
    return NextResponse.json(images);
  } catch (error) {
    console.error("Failed to list images:", error);
    return NextResponse.json(
      { error: "Failed to list images" },
      { status: 500 }
    );
  }
}
