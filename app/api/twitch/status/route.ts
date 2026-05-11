import { NextResponse } from "next/server";
import { getData } from "@/lib/data-server";

interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string;
}

interface TwitchStreamResponse {
  data: TwitchStream[];
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Twitch API credentials not configured");
  }

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
    { method: "POST" }
  );

  if (!res.ok) {
    throw new Error("Failed to get Twitch access token");
  }

  const data = (await res.json()) as TwitchTokenResponse;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export async function GET() {
  try {
    const siteData = getData();
    const username = siteData.twitchUsername?.trim();

    if (!username) {
      return NextResponse.json({ live: false, error: "No Twitch username configured" });
    }

    const clientId = process.env.TWITCH_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ live: false, error: "Twitch Client ID not configured" });
    }

    const token = await getAppAccessToken();

    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(username.toLowerCase())}`,
      {
        headers: {
          "Client-Id": clientId,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { live: false, error: err.message || "Twitch API error" },
        { status: 500 }
      );
    }

    const streamData = (await res.json()) as TwitchStreamResponse;
    const stream = streamData.data?.[0];

    if (stream && stream.type === "live") {
      return NextResponse.json({
        live: true,
        title: stream.title,
        viewerCount: stream.viewer_count,
        gameName: stream.game_name,
        thumbnailUrl: stream.thumbnail_url
          .replace("{width}", "640")
          .replace("{height}", "360"),
      });
    }

    return NextResponse.json({ live: false });
  } catch (error: any) {
    console.error("Twitch status error:", error);
    return NextResponse.json(
      { live: false, error: error.message || "Failed to check Twitch status" },
      { status: 500 }
    );
  }
}
