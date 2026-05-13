"use client";

import { useRef, useEffect, useCallback } from "react";

export function useGameMusic(src: string, initialVolume = 0.4) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(false);
  const volumeRef = useRef(initialVolume);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volumeRef.current;
    audioRef.current = audio;

    // Attempt to play (browsers may block until user interaction)
    const tryPlay = () => {
      if (audioRef.current && !mutedRef.current) {
        audioRef.current.play().catch(() => {
          // Autoplay blocked — will play on first user interaction
        });
      }
    };

    tryPlay();

    // Retry on first user interaction if autoplay was blocked
    const handleInteraction = () => {
      tryPlay();
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };

    window.addEventListener("click", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    window.addEventListener("touchstart", handleInteraction);

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };
  }, [src]);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    const audio = audioRef.current;
    if (!audio) return;
    if (muted) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    volumeRef.current = clamped;
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    // If volume is raised from 0 and we're not muted, make sure we're playing
    if (clamped > 0 && !mutedRef.current && audioRef.current?.paused) {
      audioRef.current.play().catch(() => {});
    }
  }, []);

  const isMuted = useCallback(() => mutedRef.current, []);

  return { setMuted, setVolume, isMuted };
}
