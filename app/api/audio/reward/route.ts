import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "private", "audio", "clhg.mp3");
  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch {
    return new NextResponse("Audio not found", { status: 404 });
  }
}
