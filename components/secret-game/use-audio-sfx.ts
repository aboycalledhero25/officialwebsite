"use client";

import { useRef, useCallback } from "react";

export type SoundName = "shoot" | "enemyHit" | "playerHit" | "gameOver" | "levelComplete";

// Shared AudioContext reference for unlocking from input handlers
let sharedCtx: AudioContext | null = null;

export function unlockAudio() {
  if (sharedCtx && sharedCtx.state === "suspended") {
    sharedCtx.resume();
  }
}

export function useAudioSfx() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const mutedRef = useRef(false);

  const ensureCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      sharedCtx = ctxRef.current;
      masterGainRef.current = ctxRef.current.createGain();
      masterGainRef.current.connect(ctxRef.current.destination);
      masterGainRef.current.gain.value = 1;
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return { ctx: ctxRef.current, master: masterGainRef.current! };
  };

  const play = useCallback((name: SoundName) => {
    if (mutedRef.current) return;
    const { ctx, master } = ensureCtx();
    const t = ctx.currentTime;

    switch (name) {
      case "shoot": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(440, t + 0.05);
        gain.gain.setValueAtTime(0.3, t);
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
        gain.gain.setValueAtTime(0.25, t);
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
        gain.gain.setValueAtTime(0.3, t);
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
        gain.gain.setValueAtTime(0.3, t);
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
          gain.gain.setValueAtTime(0.2, t + i * 0.1);
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

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = muted ? 0 : 1;
    }
  }, []);

  const isMuted = () => mutedRef.current;

  return { play, setMuted, isMuted };
}
