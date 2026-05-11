"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { sharedKeys, sharedTouch } from "./use-keyboard-controls";
import { useSiteData } from "@/components/data-provider";

const BASE_W = 240;

interface MobileControlsProps {
  onShoot: (active: boolean) => void;
}

export function MobileControls({ onShoot }: MobileControlsProps) {
  const touchAreaRef = useRef<HTMLDivElement>(null);
  const [isTouching, setIsTouching] = useState(false);
  const siteData = useSiteData();
  const isMobile = typeof window !== "undefined" && (window.innerWidth < 768 || "ontouchstart" in window);
  const plat = siteData.secretGame?.[isMobile ? "mobile" : "desktop"];
  const touchArea = plat?.touchArea ?? { visible: true, x: 0, y: 200, width: 240, height: 120 };
  const fireBtn = plat?.fireButton ?? { visible: true, x: 200, y: 270, size: 44 };

  const updateTargetFromTouch = useCallback((clientX: number) => {
    const area = touchAreaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    sharedTouch.targetX = ratio * BASE_W - 5;
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

  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => setScale(window.innerHeight / 320);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <>
      {/* Touch area for drag-to-move */}
      {touchArea.visible && (
        <div
          ref={touchAreaRef}
          className="absolute z-20 touch-none select-none"
          style={{
            left: touchArea.x * scale,
            top: touchArea.y * scale,
            width: touchArea.width * scale,
            height: touchArea.height * scale,
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
            left: fireBtn.x * scale,
            top: fireBtn.y * scale,
            width: fireBtn.size * scale,
            height: fireBtn.size * scale,
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
