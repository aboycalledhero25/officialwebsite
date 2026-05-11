"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { sharedKeys, sharedTouch } from "./use-keyboard-controls";

const BASE_W = 240;

interface MobileControlsProps {
  onShoot: (active: boolean) => void;
}

export function MobileControls({ onShoot }: MobileControlsProps) {
  const touchAreaRef = useRef<HTMLDivElement>(null);
  const [isTouching, setIsTouching] = useState(false);

  const updateTargetFromTouch = useCallback((clientX: number) => {
    const area = touchAreaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    // Map to game logic coordinates (center the ship on the finger)
    sharedTouch.targetX = ratio * BASE_W - 5; // 5 = PLAYER_W_BASE/2
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

  // Also handle mouse for desktop testing of touch controls
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

  // Global mouse up to catch drags that leave the touch area
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
      {/* Invisible touch area at bottom for drag-to-move */}
      <div
        ref={touchAreaRef}
        className="absolute bottom-0 left-0 right-0 h-[35vh] z-20 touch-none select-none"
        style={{ cursor: isTouching ? "grabbing" : "grab" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Fire button — bottom right, floating */}
      <div className="absolute bottom-6 right-6 z-30 pointer-events-auto">
        <button
          className="w-20 h-20 rounded-full bg-[#ff006e]/25 border-2 border-[#ff006e]/50 active:bg-[#ff006e]/50 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,0,110,0.3)] flex items-center justify-center text-3xl select-none touch-none backdrop-blur-sm"
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

      {/* Subtle hint text */}
      <div className="absolute bottom-2 left-0 right-0 z-20 text-center pointer-events-none">
        <span className="text-[10px] text-white/30 uppercase tracking-widest">
          Drag to move · Tap fire to shoot
        </span>
      </div>
    </>
  );
}
