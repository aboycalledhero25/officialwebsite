import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REEL";
  media_url?: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  children?: {
    data: Array<{ media_url: string; id: string }>;
  };
}

interface InstagramApiResponse {
  data: InstagramMediaItem[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
  };
  error?: {
    message: string;
    code: number;
  };
}

interface PageAccount {
  id: string;
  name: string;
  instagram_business_account?: {
    id: string;
  };
  access_token?: string;
}

const dataPath = path.join(process.cwd(), "lib", "data.json");

async function readData(): Promise<any> {
  const raw = await fs.readFile(dataPath, "utf-8");
  return JSON.parse(raw);
}

async function writeData(data: any): Promise<void> {
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2), "utf-8");
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || (data as any).error) {
    throw new Error((data as any).error?.message || `HTTP ${res.status}`);
  }
  return data;
}

/**
 * Discover the Instagram Business Account ID connected to the user's Facebook Pages.
 * Returns the first page that has an instagram_business_account.
 */
async function discoverInstagramBusinessAccount(token: string): Promise<{
  page: PageAccount;
  igAccountId: string;
}> {
  const url = `${GRAPH_API_BASE}/me/accounts?fields=name,id,instagram_business_account,access_token&access_token=${encodeURIComponent(token)}`;
  const result = await fetchJson<{ data: PageAccount[] }>(url);

  if (!result.data || result.data.length === 0) {
    throw new Error(
      "DISCOVERY_EMPTY_PAGES"
    );
  }

  const page = result.data.find((p) => p.instagram_business_account?.id);
  if (!page) {
    throw new Error(
      "DISCOVERY_NO_IG_ACCOUNT"
    );
  }

  return {
    page,
    igAccountId: page.instagram_business_account!.id,
  };
}

async function canFetchMediaDirectly(
  igAccountId: string,
  token: string
): Promise<boolean> {
  try {
    const url = `${GRAPH_API_BASE}/${igAccountId}/media?fields=id&limit=1&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch a specific Facebook Page by ID and return its Instagram Business Account.
 */
async function getInstagramBusinessAccountFromPageId(
  pageId: string,
  token: string
): Promise<{ page: PageAccount; igAccountId: string }> {
  const url = `${GRAPH_API_BASE}/${pageId}?fields=name,id,instagram_business_account&access_token=${encodeURIComponent(token)}`;
  const page = await fetchJson<PageAccount>(url);

  if (!page.instagram_business_account?.id) {
    throw new Error(
      "DISCOVERY_NO_IG_ACCOUNT"
    );
  }

  return {
    page,
    igAccountId: page.instagram_business_account.id,
  };
}

/**
 * Fetch media from an Instagram Business Account using the Graph API.
 */
async function fetchInstagramMedia(
  igAccountId: string,
  token: string
): Promise<InstagramMediaItem[]> {
  const fields =
    "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{media_url}";
  const url = `${GRAPH_API_BASE}/${igAccountId}/media?fields=${fields}&limit=12&access_token=${encodeURIComponent(token)}`;
  const result = await fetchJson<InstagramApiResponse>(url);
  return result.data || [];
}

function getBestImageUrl(item: InstagramMediaItem): string {
  if (item.media_type === "VIDEO" || item.media_type === "REEL") {
    return item.thumbnail_url || item.media_url || "";
  }
  if (item.media_type === "CAROUSEL_ALBUM") {
    return (
      item.children?.data?.[0]?.media_url || item.media_url || ""
    );
  }
  return item.media_url || "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await readData();
    const token = body.token || data.instagramToken;
    const manualIgId = body.igBusinessAccountId || data.instagramBusinessAccountId;

    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return NextResponse.json(
        { error: "No access token provided. Paste your token in the admin dashboard." },
        { status: 400 }
      );
    }

    // Discover or use manual Instagram Business Account ID
    let igAccountId: string;
    let pageName = "";
    const manualPageId = body.pageId || data.facebookPageId;

    if (manualIgId && manualIgId.trim().length > 0) {
      igAccountId = manualIgId.trim();
    } else if (manualPageId && manualPageId.trim().length > 0) {
      // Try fetching the specific page directly
      try {
        const result = await getInstagramBusinessAccountFromPageId(
          manualPageId.trim(),
          token
        );
        igAccountId = result.igAccountId;
        pageName = result.page.name;
      } catch {
        // If page lookup fails, the token might not have page permissions.
        // We'll still try to fetch media if the user provides the IG ID directly.
        throw new Error(
          "Could not look up the Facebook Page. Your token might not have page permissions. Try pasting your Instagram Business Account ID directly (find it in your Instagram app under Settings → Account → Switch to Professional Account, or ask Meta support)."
        );
      }
    } else {
      try {
        const discovery = await discoverInstagramBusinessAccount(token);
        igAccountId = discovery.igAccountId;
        pageName = discovery.page.name;
      } catch (err: any) {
        if (err.message === "DISCOVERY_EMPTY_PAGES") {
          throw new Error(
            "No Facebook Pages found for this account.\n\nThis usually means your token doesn't have page permissions (which is normal with Meta's current OAuth bugs).\n\nYou have two options:\n1. Paste your Instagram Business Account ID directly below and sync.\n2. Or go to Graph API Explorer, generate a token with 'pages_read_engagement' permission, and paste it manually."
          );
        }
        if (err.message === "DISCOVERY_NO_IG_ACCOUNT") {
          throw new Error(
            "None of your Facebook Pages have an Instagram Business account connected. Go to your Facebook Page settings → Linked Accounts → Instagram, and connect your Instagram Business account."
          );
        }
        throw err;
      }
    }

    // Verify the token can actually fetch media from this IG account
    const canFetch = await canFetchMediaDirectly(igAccountId, token);
    if (!canFetch) {
      throw new Error(
        "Your token cannot access this Instagram Business Account. Make sure:\n1. The IG Business Account ID is correct.\n2. Your token has the 'instagram_basic' permission.\n3. The Instagram account is connected to a Facebook Page that you admin."
      );
    }

    // Fetch media
    const mediaItems = await fetchInstagramMedia(igAccountId, token);

    if (!mediaItems || mediaItems.length === 0) {
      return NextResponse.json(
        { error: "No posts found on this Instagram Business account." },
        { status: 400 }
      );
    }

    // Map to our format
    const posts = mediaItems
      .map((item) => {
        const imageUrl = getBestImageUrl(item);
        return {
          id: item.id,
          image: imageUrl,
          url: item.permalink,
          caption: item.caption || "",
        };
      })
      .filter((p) => p.image); // Skip items where we couldn't resolve an image

    if (posts.length === 0) {
      return NextResponse.json(
        { error: "Found posts but could not extract image URLs. This can happen with restricted media types." },
        { status: 400 }
      );
    }

    // Save to data.json
    data.instagramPosts = posts;
    data.instagramToken = token;
    data.instagramBusinessAccountId = igAccountId;
    if (manualPageId) data.facebookPageId = manualPageId.trim();
    data.instagramLastFetched = new Date().toISOString();
    await writeData(data);

    return NextResponse.json({
      success: true,
      posts,
      count: posts.length,
      igBusinessAccountId: igAccountId,
      pageName,
    });
  } catch (error: any) {
    console.error("Instagram Graph API sync error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync Instagram posts" },
      { status: 500 }
    );
  }
}
