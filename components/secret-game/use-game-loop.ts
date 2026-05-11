"use client";

import { useEffect, useRef } from "react";

export function useGameLoop(callback: (dt: number) => void, active: boolean) {
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      lastTimeRef.current = 0;
      return;
    }

    const loop = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05); // cap dt at 50ms
      lastTimeRef.current = time;
      callback(dt);
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      lastTimeRef.current = 0;
    };
  }, [active, callback]);
}
