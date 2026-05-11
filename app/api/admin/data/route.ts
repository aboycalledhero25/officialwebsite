import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from("config")
      .download("data.json");

    if (error) {
      throw error;
    }

    const text = await data.text();
    const json = JSON.parse(text);
    return NextResponse.json(json);
  } catch (error) {
    console.error("Failed to read data from Supabase:", error);
    return NextResponse.json(
      { error: "Failed to read data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const blob = new Blob([JSON.stringify(body, null, 2)], {
      type: "application/json",
    });

    const { error } = await supabaseAdmin.storage
      .from("config")
      .upload("data.json", blob, {
        contentType: "application/json",
        upsert: true,
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to write data to Supabase:", error);
    return NextResponse.json(
      { error: "Failed to save data" },
      { status: 500 }
    );
  }
}
