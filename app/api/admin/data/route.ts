import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const dataPath = path.join(process.cwd(), "lib", "data.json");

export async function GET() {
  try {
    const raw = await fs.readFile(dataPath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to read data.json:", error);
    return NextResponse.json(
      { error: "Failed to read data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await fs.writeFile(
      dataPath,
      JSON.stringify(body, null, 2),
      "utf-8"
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to write data.json:", error);
    return NextResponse.json(
      { error: "Failed to save data" },
      { status: 500 }
    );
  }
}
