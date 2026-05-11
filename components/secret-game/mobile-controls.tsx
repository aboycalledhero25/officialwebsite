"use client";

import { useCallback, useEffect, useState } from "react";
import { sharedKeys, sharedTouch } from "./use-keyboard-controls";
import { useSiteData } from "@/components/data-provider";

const BASE_W = 240;
const BASE_H = 320;
const MOBILE_Y_OFFSET = 32; // base units — moves guitar above finger

interface MobileControlsProps {
  onShoot: (active: boolean) => void;
}

export function MobileControls({ onShoot }: MobileControlsProps) {
  const [isTouching, setIsTouching] = useState(false);
  const siteData = useSiteData();
  const [dims, setDims] = useState({ w: 375, h: 812 });

  useEffect(() => {
    const update = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isMobile = typeof window !== "undefined" && (window.innerWidth < 768 || "ontouchstart" in window);
  const plat = siteData.secretGame?.[isMobile ? "mobile" : "desktop"];
  const fireBtn = plat?.fireButton ?? { visible: true, x: 200, y: 270, size: 44 };

  // Scale stored positions (0-240 x, 0-320 y) to actual screen
  const sx = (v: number) => (v / BASE_W) * dims.w;
  const sy = (v: number) => (v / BASE_H) * dims.h;

  // Convert screen pixel to base game coordinates
  const screenToBase = useCallback(
    (clientX: number, clientY: number) => ({
      x: Math.max(0, Math.min(BASE_W, (clientX / dims.w) * BASE_W)),
      y: Math.max(0, Math.min(BASE_H, (clientY / dims.h) * BASE_H)),
    }),
    [dims.w, dims.h]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Ignore if touching the fire button area
      const target = e.target as HTMLElement;
      if (target.closest("[data-fire-btn]")) return;
      e.preventDefault();
      setIsTouching(true);
      const t = e.touches[0];
      const pos = screenToBase(t.clientX, t.clientY);
      sharedTouch.targetX = pos.x;
      sharedTouch.targetY = Math.max(0, pos.y - MOBILE_Y_OFFSET);
    },
    [screenToBase]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isTouching) return;
      e.preventDefault();
      const t = e.touches[0];
      const pos = screenToBase(t.clientX, t.clientY);
      sharedTouch.targetX = pos.x;
      sharedTouch.targetY = Math.max(0, pos.y - MOBILE_Y_OFFSET);
    },
    [isTouching, screenToBase]
  );

  const handleTouchEnd = useCallback(() => {
    setIsTouching(false);
    sharedTouch.targetX = null;
    sharedTouch.targetY = null;
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-fire-btn]")) return;
      setIsTouching(true);
      const pos = screenToBase(e.clientX, e.clientY);
      sharedTouch.targetX = pos.x;
      sharedTouch.targetY = Math.max(0, pos.y - MOBILE_Y_OFFSET);
    },
    [screenToBase]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isTouching) return;
      const pos = screenToBase(e.clientX, e.clientY);
      sharedTouch.targetX = pos.x;
      sharedTouch.targetY = Math.max(0, pos.y - MOBILE_Y_OFFSET);
    },
    [isTouching, screenToBase]
  );

  const handleMouseUp = useCallback(() => {
    setIsTouching(false);
    sharedTouch.targetX = null;
    sharedTouch.targetY = null;
  }, []);

  useEffect(() => {
    const onUp = () => {
      setIsTouching(false);
      sharedTouch.targetX = null;
      sharedTouch.targetY = null;
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  return (
    <>
      {/* Full-screen movement layer — finger follows sprite */}
      <div
        className="fixed inset-0 z-20 touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Fire button */}
      {fireBtn.visible && (
        <div
          data-fire-btn
          className="absolute z-30 pointer-events-auto"
          style={{
            left: sx(fireBtn.x),
            top: sy(fireBtn.y),
            width: sx(fireBtn.size),
            height: sx(fireBtn.size),
          }}
        >
          <button
            className="w-full h-full rounded-full bg-[#ff006e]/25 border-2 border-[#ff006e]/50 active:bg-[#ff006e]/50 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,0,110,0.3)] flex items-center justify-center text-3xl select-none touch-none backdrop-blur-sm"
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShoot(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShoot(false);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onShoot(true);
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              onShoot(false);
            }}
            onMouseLeave={(e) => {
              e.stopPropagation();
              onShoot(false);
            }}
            aria-label="Shoot"
          >
            🔥
          </button>
        </div>
      )}
    </>
  );
}
