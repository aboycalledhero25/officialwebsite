import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

function getExtensionFromContentType(contentType: string | null): string {
  if (!contentType) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

interface SpotifyOEmbed {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

interface iTunesResult {
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
  artworkUrl30?: string;
}

async function fetchSpotifyOembed(url: string): Promise<SpotifyOEmbed> {
  const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
  const res = await fetch(oembedUrl);
  if (!res.ok) {
    throw new Error(`Spotify oEmbed failed: ${res.status}`);
  }
  return res.json();
}

async function searchITunes(
  artist: string,
  title: string
): Promise<iTunesResult | null> {
  // Try searching by artist + title first
  const term = `${artist} ${title}`;
  const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=10`;
  const res = await fetch(searchUrl);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;

  // Find the best match
  const lowerTitle = title.toLowerCase();
  const lowerArtist = artist.toLowerCase();

  // Prefer exact or close matches
  const sorted = (data.results as iTunesResult[]).sort((a, b) => {
    const aTrack = (a.trackName || "").toLowerCase();
    const bTrack = (b.trackName || "").toLowerCase();
    const aArtist = (a.artistName || "").toLowerCase();
    const bArtist = (b.artistName || "").toLowerCase();

    const aScore =
      (aTrack === lowerTitle ? 100 : aTrack.includes(lowerTitle) ? 50 : 0) +
      (aArtist === lowerArtist ? 100 : aArtist.includes(lowerArtist) ? 50 : 0);
    const bScore =
      (bTrack === lowerTitle ? 100 : bTrack.includes(lowerTitle) ? 50 : 0) +
      (bArtist === lowerArtist ? 100 : bArtist.includes(lowerArtist) ? 50 : 0);

    return bScore - aScore;
  });

  return sorted[0];
}

async function fetchHighResFromSpotify(url: string): Promise<string> {
  const oembed = await fetchSpotifyOembed(url);

  // Try iTunes search for high-res artwork
  const itunesResult = await searchITunes(oembed.author_name, oembed.title);
  if (itunesResult?.artworkUrl100) {
    return itunesResult.artworkUrl100.replace("100x100bb", "3000x3000bb");
  }

  // Fallback to Spotify's own thumbnail (max 640px)
  if (!oembed.thumbnail_url) {
    throw new Error("No thumbnail returned from Spotify");
  }
  return oembed.thumbnail_url;
}

async function fetchAppleMusicArtwork(url: string): Promise<string> {
  const match = url.match(/\/(album|song|playlist)\/[^/]+\/(\d+)/);
  if (!match) {
    throw new Error("Could not extract Apple Music ID from URL");
  }
  const id = match[2];

  const lookupUrl = `https://itunes.apple.com/lookup?id=${id}`;
  const res = await fetch(lookupUrl);
  if (!res.ok) {
    throw new Error(`iTunes lookup failed: ${res.status}`);
  }
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error("No results found on iTunes");
  }

  const result = data.results[0] as iTunesResult;
  const artworkUrl = result.artworkUrl100;
  if (!artworkUrl) {
    throw new Error("No artwork found in iTunes result");
  }

  return artworkUrl.replace("100x100bb", "3000x3000bb");
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "No URL provided" },
        { status: 400 }
      );
    }

    let imageUrl: string;
    let prefix: string;

    if (url.includes("spotify.com")) {
      imageUrl = await fetchHighResFromSpotify(url);
      prefix = "spotify";
    } else if (url.includes("music.apple.com")) {
      imageUrl = await fetchAppleMusicArtwork(url);
      prefix = "apple";
    } else {
      return NextResponse.json(
        { error: "Unsupported URL. Only Spotify and Apple Music links work." },
        { status: 400 }
      );
    }

    // Download the image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to download image: ${imgRes.status}`);
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    const ext = getExtensionFromContentType(imgRes.headers.get("content-type"));
    const timestamp = Date.now();
    const filename = `${prefix}-artwork-${timestamp}.${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "images");
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      path: `/images/${filename}`,
      filename,
    });
  } catch (error: any) {
    console.error("Fetch artwork error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch artwork" },
      { status: 500 }
    );
  }
}
