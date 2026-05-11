/**
 * Extracts a YouTube video ID from various URL formats.
 * If the input is already just an ID, returns it as-is.
 * Returns null if no valid ID could be extracted.
 */
export function extractYouTubeId(input: string): string | null {
  if (!input || input.trim() === "" || input === "PLACEHOLDER") {
    return null;
  }

  const trimmed = input.trim();

  // Already looks like just an ID (11 chars, alphanumeric + _ -)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // Short URL: https://youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // Embed URL: https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // Old v URL: https://www.youtube.com/v/VIDEO_ID
  const vMatch = trimmed.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
  if (vMatch) return vMatch[1];

  // Shorts URL: https://www.youtube.com/shorts/VIDEO_ID
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  // Live URL: https://www.youtube.com/live/VIDEO_ID
  const liveMatch = trimmed.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
  if (liveMatch) return liveMatch[1];

  // OEmbed URL: https://www.youtube.com/oembed?url=...
  const oembedMatch = trimmed.match(/v=([a-zA-Z0-9_-]{11})/);
  if (oembedMatch) return oembedMatch[1];

  return null;
}

/**
 * Builds a YouTube embed URL from an ID.
 */
export function buildYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}
