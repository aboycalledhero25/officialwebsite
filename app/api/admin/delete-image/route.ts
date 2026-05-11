import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const { filename } = await request.json();
    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        { error: "No filename provided" },
        { status: 400 }
      );
    }

    // Security: prevent directory traversal
    const safeName = path.basename(filename);
    if (!safeName || safeName.startsWith(".")) {
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), "public", "images", safeName);
    const resolvedPath = path.resolve(filePath);
    const imagesDir = path.resolve(path.join(process.cwd(), "public", "images"));

    // Ensure the file is inside the images directory
    if (!resolvedPath.startsWith(imagesDir)) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 403 }
      );
    }

    await fs.unlink(filePath);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete image error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete image" },
      { status: 500 }
    );
  }
}
