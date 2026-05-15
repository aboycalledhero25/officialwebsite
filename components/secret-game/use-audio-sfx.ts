"use client";

import { useRef, useCallback } from "react";

export type SoundName = "shoot" | "enemyHit" | "playerHit" | "gameOver" | "levelComplete";

// Shared AudioContext reference — created on first user gesture so mobile browsers allow it.
let sharedCtx: AudioContext | null = null;
// Shared master gain created alongside sharedCtx
let sharedMaster: GainNode | null = null;

// Module-level per-sound volume map — shared across all useAudioSfx instances.
// Keys match SoundName values + audio file base-names (bomb, lightning, powerup, connect, shield).
let sharedSoundVolumes: Record<string, number> = {};

/** Update per-sound volumes from admin mixer settings. Call from retro-arcade-game once on mount. */
export function setSoundVolumes(volumes: Record<string, number>) {
  sharedSoundVolumes = { ...volumes };
}

/**
 * Call this from any user-gesture handler (touchstart, mousedown, keydown).
 * Creates the shared AudioContext on the first call so mobile browsers allow it
 * to start in "running" state. Resumes it if it was suspended.
 */
export function unlockAudio() {
  if (!sharedCtx) {
    sharedCtx = new AudioContext();
    sharedMaster = sharedCtx.createGain();
    sharedMaster.gain.value = 1;
    sharedMaster.connect(sharedCtx.destination);
  }
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume();
  }
}

/** Get the shared AudioContext (null if unlockAudio hasn't been called yet). */
export function getSharedAudioContext(): AudioContext | null {
  return sharedCtx;
}

export function useAudioSfx() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const mutedRef = useRef(false);
  const sfxVolumeRef = useRef(1);

  const ensureCtx = () => {
    if (!ctxRef.current) {
      // Reuse the shared context created by unlockAudio() on first user gesture,
      // so the context is already in "running" state on mobile.
      // Fall back to creating a new one if unlockAudio hasn't fired yet.
      const ctx = sharedCtx ?? new AudioContext();
      ctxRef.current = ctx;
      sharedCtx = ctx;

      if (sharedMaster) {
        // Reuse the already-connected master gain
        masterGainRef.current = sharedMaster;
      } else {
        masterGainRef.current = ctx.createGain();
        masterGainRef.current.connect(ctx.destination);
        sharedMaster = masterGainRef.current;
      }
      masterGainRef.current.gain.value = sfxVolumeRef.current;
    }
    return { ctx: ctxRef.current, master: masterGainRef.current! };
  };

  const play = useCallback((name: SoundName) => {
    if (mutedRef.current) return;
    const { ctx, master } = ensureCtx();
    // Skip when context is suspended — prevents a burst of sounds when mobile unlocks the context
    if (ctx.state === "suspended") return;
    const t = ctx.currentTime;
    // Per-sound volume from admin mixer (default 1.0 if not set)
    const sv = sharedSoundVolumes[name] ?? 1;

    switch (name) {
      case "shoot": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(440, t + 0.05);
        gain.gain.setValueAtTime(0.3 * sv, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(gain);
        gain.connect(master);
        osc.start(t);
        osc.stop(t + 0.05);
        break;
      }
      case "enemyHit": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.1);
        gain.gain.setValueAtTime(0.25 * sv, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain);
        gain.connect(master);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
      }
      case "playerHit": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.3);
        gain.gain.setValueAtTime(0.3 * sv, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(master);
        osc.start(t);
        osc.stop(t + 0.3);
        break;
      }
      case "gameOver": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.8);
        gain.gain.setValueAtTime(0.3 * sv, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.8);
        osc.connect(gain);
        gain.connect(master);
        osc.start(t);
        osc.stop(t + 0.8);
        break;
      }
      case "levelComplete": {
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(freq, t + i * 0.1);
          gain.gain.setValueAtTime(0.2 * sv, t + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.15);
          osc.connect(gain);
          gain.connect(master);
          osc.start(t + i * 0.1);
          osc.stop(t + i * 0.1 + 0.15);
        });
        break;
      }
    }
  }, []);

  /** Decoded AudioBuffer cache keyed by URL — loaded on first play. */
  const bufferCacheRef = useRef<Record<string, AudioBuffer>>({});

  /**
   * Play an audio file (e.g. an MP3 in /public/audio/) through the Web Audio
   * master gain so it respects the mute state and plays simultaneously with
   * the background music.  Per-sound volumes from the admin mixer are applied
   * by extracting the file base-name (e.g. /audio/bomb.mp3 → "bomb").
   */
  const playFile = useCallback(async (url: string) => {
    if (mutedRef.current) return;
    const { ctx, master } = ensureCtx();
    // Skip when context is suspended — prevents burst on mobile
    if (ctx.state === "suspended") return;
    try {
      let buffer = bufferCacheRef.current[url];
      if (!buffer) {
        const res = await fetch(url);
        const arrayBuf = await res.arrayBuffer();
        buffer = await ctx.decodeAudioData(arrayBuf);
        bufferCacheRef.current[url] = buffer;
      }
      // Derive the sound key from the URL (e.g. /audio/bomb.mp3 → "bomb")
      const soundKey = url.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
      const sv = sharedSoundVolumes[soundKey] ?? 1;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      if (sv !== 1) {
        const fileGain = ctx.createGain();
        fileGain.gain.value = Math.max(0, sv);
        source.connect(fileGain);
        fileGain.connect(master);
      } else {
        source.connect(master);
      }
      source.start();
    } catch {
      // Audio unavailable — silently ignore
    }
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = muted ? 0 : sfxVolumeRef.current;
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    sfxVolumeRef.current = clamped;
    if (masterGainRef.current && !mutedRef.current) {
      masterGainRef.current.gain.value = clamped;
    }
  }, []);

  const isMuted = useCallback(() => mutedRef.current, []);

  return { play, playFile, setMuted, setVolume, isMuted };
}


