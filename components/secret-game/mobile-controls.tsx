"use client";

import { useCallback, useEffect, useRef } from "react";
import { sharedTouch, sharedAim } from "./use-keyboard-controls";
import { unlockAudio } from "./use-audio-sfx";
import { useSiteData } from "@/components/data-provider";

const BASE_W = 240;
const BASE_H = 320;

interface MobileControlsProps {
  onShoot?: (active: boolean) => void; // kept for backward compat, unused
}

export function MobileControls({}: MobileControlsProps) {
  const activeTouches = useRef<Map<number, { x: number; y: number }>>(new Map());
  const leftDownRef = useRef(false);
  const rightDownRef = useRef(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const siteData = useSiteData();

  const spriteConfig = siteData.secretGame?.playerSprite ?? { offsetX: -2, offsetY: -12, width: 14, height: 42 };
  // Compute offset so guitar bottom sits exactly at the finger position
  const mobileYOffset = spriteConfig.offsetY + spriteConfig.height;

  // Convert screen pixel to base game coordinates using the control layer's actual size
  const screenToBase = useCallback((clientX: number, clientY: number) => {
    const layer = layerRef.current;
    const rect = layer ? layer.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 };
    const vw = window.visualViewport;
    // Use visualViewport when available for consistent sizing across mobile browsers
    const viewW = vw ? vw.width : rect.width;
    const viewH = vw ? vw.height : rect.height;
    const viewLeft = vw ? vw.offsetLeft : rect.left;
    const viewTop = vw ? vw.offsetTop : rect.top;

    return {
      x: Math.max(0, Math.min(BASE_W, ((clientX - viewLeft) / viewW) * BASE_W)),
      y: Math.max(0, Math.min(BASE_H, ((clientY - viewTop) / viewH) * BASE_H)),
    };
  }, []);

  const syncTouchState = useCallback(() => {
    const touches = Array.from(activeTouches.current.values());
    if (touches.length === 0) {
      sharedTouch.targetX = null;
      sharedTouch.targetY = null;
      sharedAim.x = null;
      sharedAim.y = null;
      sharedAim.firing = false;
      sharedAim.aiming = false;
    } else {
      // First touch = movement target
      sharedTouch.targetX = touches[0].x;
      sharedTouch.targetY = Math.max(0, touches[0].y - mobileYOffset);
      sharedAim.firing = true;
      if (touches.length >= 2) {
        // Second touch = directional aim
        sharedAim.aiming = true;
        sharedAim.x = touches[1].x;
        sharedAim.y = touches[1].y;
      } else {
        // One touch = normal straight-up fire
        sharedAim.aiming = false;
        sharedAim.x = null;
        sharedAim.y = null;
      }
    }
  }, [mobileYOffset]);

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      unlockAudio(); // mobile browsers require user gesture to start AudioContext
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const pos = screenToBase(t.clientX, t.clientY);
        activeTouches.current.set(t.identifier, pos);
      }
      syncTouchState();
    },
    [screenToBase, syncTouchState]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const pos = screenToBase(t.clientX, t.clientY);
        activeTouches.current.set(t.identifier, pos);
      }
      syncTouchState();
    },
    [screenToBase, syncTouchState]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        activeTouches.current.delete(t.identifier);
      }
      syncTouchState();
    },
    [syncTouchState]
  );

  // Mouse handlers (desktop)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = screenToBase(e.clientX, e.clientY);
      sharedAim.x = pos.x;
      sharedAim.y = pos.y;
    },
    [screenToBase]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    unlockAudio();
    if (e.button === 0) {
      leftDownRef.current = true;
      sharedAim.firing = true;
      sharedAim.aiming = false;
    } else if (e.button === 2) {
      rightDownRef.current = true;
      sharedAim.firing = true;
      sharedAim.aiming = true;
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button === 0) {
      leftDownRef.current = false;
      if (rightDownRef.current) {
        sharedAim.aiming = true;
      } else {
        sharedAim.firing = false;
        sharedAim.aiming = false;
      }
    } else if (e.button === 2) {
      rightDownRef.current = false;
      if (leftDownRef.current) {
        sharedAim.aiming = false;
      } else {
        sharedAim.firing = false;
        sharedAim.aiming = false;
      }
    }
  }, []);

  // Reset on unmount
  useEffect(() => {
    return () => {
      activeTouches.current.clear();
      leftDownRef.current = false;
      rightDownRef.current = false;
      sharedTouch.targetX = null;
      sharedTouch.targetY = null;
      sharedAim.x = null;
      sharedAim.y = null;
      sharedAim.firing = false;
      sharedAim.aiming = false;
    };
  }, []);

  return (
    <div
      ref={layerRef}
      className="fixed inset-0 z-20 touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
