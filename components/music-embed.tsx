"use client";

function extractSpotifyEmbedUrl(input: string): string | null {
  // Already an embed URL
  if (input.includes("open.spotify.com/embed/")) {
    return input.match(/https:\/\/open\.spotify\.com\/embed\/[^\s"']+/)?.[0] || null;
  }
  // Regular Spotify track/album/playlist URL
  const match = input.match(/https:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (match) {
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
  }
  return null;
}

function extractAppleMusicEmbedUrl(input: string): string | null {
  // Already an embed URL
  if (input.includes("embed.music.apple.com")) {
    return input.match(/https:\/\/embed\.music\.apple\.com\/[^\s"']+/)?.[0] || null;
  }
  // Regular Apple Music URL
  const match = input.match(/https:\/\/music\.apple\.com\/([^\s"']+)/);
  if (match) {
    return `https://embed.music.apple.com/${match[1]}`;
  }
  return null;
}

function getEmbedSrc(input: string): string | null {
  if (!input || input.trim().length === 0) return null;
  const trimmed = input.trim();

  // Try extracting from iframe HTML
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/);
  if (iframeMatch) {
    const src = iframeMatch[1];
    if (src.includes("spotify")) return extractSpotifyEmbedUrl(src);
    if (src.includes("music.apple")) return extractAppleMusicEmbedUrl(src);
    return src;
  }

  // Try as plain URL
  if (trimmed.includes("spotify")) return extractSpotifyEmbedUrl(trimmed);
  if (trimmed.includes("music.apple")) return extractAppleMusicEmbedUrl(trimmed);

  return null;
}

interface MusicEmbedProps {
  embedUrl: string;
}

export function MusicEmbed({ embedUrl }: MusicEmbedProps) {
  const src = getEmbedSrc(embedUrl);

  if (!src) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg bg-background text-sm text-muted">
        <span>Invalid embed URL. Paste a Spotify or Apple Music link.</span>
      </div>
    );
  }

  const isSpotify = src.includes("spotify");
  const isApple = src.includes("music.apple");

  if (isSpotify) {
    return (
      <iframe
        src={src}
        width="100%"
        height="352"
        frameBorder="0"
        allowFullScreen
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="rounded-lg"
      />
    );
  }

  if (isApple) {
    return (
      <iframe
        src={src}
        width="100%"
        height="150"
        frameBorder="0"
        allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
        style={{ width: "100%", maxWidth: "660px", overflow: "hidden", borderRadius: "10px" }}
        className="mx-auto"
      />
    );
  }

  // Fallback for other embeds
  return (
    <iframe
      src={src}
      width="100%"
      height="352"
      frameBorder="0"
      allowFullScreen
      className="rounded-lg"
    />
  );
}
