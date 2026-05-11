"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { sharedKeys, sharedTouch } from "./use-keyboard-controls";
import { useSiteData } from "@/components/data-provider";

const BASE_W = 240;
const BASE_H = 320;

interface MobileControlsProps {
  onShoot: (active: boolean) => void;
}

export function MobileControls({ onShoot }: MobileControlsProps) {
  const touchAreaRef = useRef<HTMLDivElement>(null);
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
  const touchArea = plat?.touchArea ?? { visible: true, x: 0, y: 200, width: 240, height: 120 };
  const fireBtn = plat?.fireButton ?? { visible: true, x: 200, y: 270, size: 44 };

  // Scale stored positions (0-240 x, 0-320 y) to actual screen
  const sx = (v: number) => (v / BASE_W) * dims.w;
  const sy = (v: number) => (v / BASE_H) * dims.h;

  const updateTargetFromTouch = useCallback((clientX: number) => {
    const area = touchAreaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    // Map to game base coordinates (0-240)
    sharedTouch.targetX = ratio * BASE_W;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      setIsTouching(true);
      updateTargetFromTouch(e.touches[0].clientX);
    },
    [updateTargetFromTouch]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      updateTargetFromTouch(e.touches[0].clientX);
    },
    [updateTargetFromTouch]
  );

  const handleTouchEnd = useCallback(() => {
    setIsTouching(false);
    sharedTouch.targetX = null;
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsTouching(true);
      updateTargetFromTouch(e.clientX);
    },
    [updateTargetFromTouch]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isTouching) return;
      updateTargetFromTouch(e.clientX);
    },
    [isTouching, updateTargetFromTouch]
  );

  const handleMouseUp = useCallback(() => {
    setIsTouching(false);
    sharedTouch.targetX = null;
  }, []);

  useEffect(() => {
    const onUp = () => {
      setIsTouching(false);
      sharedTouch.targetX = null;
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  return (
    <>
      {/* Touch area for drag-to-move */}
      {touchArea.visible && (
        <div
          ref={touchAreaRef}
          className="absolute z-20 touch-none select-none"
          style={{
            left: sx(touchArea.x),
            top: sy(touchArea.y),
            width: sx(touchArea.width),
            height: sy(touchArea.height),
            cursor: isTouching ? "grabbing" : "grab",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      )}

      {/* Fire button */}
      {fireBtn.visible && (
        <div
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
