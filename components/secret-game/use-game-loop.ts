"use client";

import { useEffect, useRef } from "react";

export function useGameLoop(callback: (dt: number) => void, active: boolean, targetFps?: number) {
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      lastTimeRef.current = 0;
      accumulatorRef.current = 0;
      return;
    }

    const frameInterval = targetFps ? 1000 / targetFps : 0;

    const loop = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const rawDt = time - lastTimeRef.current;
      lastTimeRef.current = time;

      // Frame-rate capping: skip frames if running faster than target
      if (frameInterval > 0) {
        accumulatorRef.current += rawDt;
        if (accumulatorRef.current < frameInterval) {
          frameRef.current = requestAnimationFrame(loop);
          return;
        }
        accumulatorRef.current -= frameInterval;
        // If we're way behind, don't try to catch up with huge dt
        if (accumulatorRef.current > frameInterval * 2) {
          accumulatorRef.current = frameInterval * 2;
        }
      }

      const dt = Math.min((frameInterval > 0 ? frameInterval : rawDt) / 1000, 0.05); // cap dt at 50ms
      try {
        callback(dt);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Game loop error:", e);
      }
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      lastTimeRef.current = 0;
      accumulatorRef.current = 0;
    };
  }, [active, callback, targetFps]);
}
