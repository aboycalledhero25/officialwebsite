"use client";

import { useCallback, useEffect, useRef } from "react";
import { sharedTouch, sharedAim } from "./use-keyboard-controls";

const BASE_W = 240;
const BASE_H = 320;
const MOBILE_Y_OFFSET = 32; // base units — moves guitar above finger

interface MobileControlsProps {
  onShoot?: (active: boolean) => void; // kept for backward compat, unused
}

export function MobileControls({}: MobileControlsProps) {
  const activeTouches = useRef<Map<number, { x: number; y: number }>>(new Map());
  const leftDownRef = useRef(false);
  const rightDownRef = useRef(false);

  // Convert screen pixel to base game coordinates
  const screenToBase = useCallback((clientX: number, clientY: number) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return {
      x: Math.max(0, Math.min(BASE_W, (clientX / w) * BASE_W)),
      y: Math.max(0, Math.min(BASE_H, (clientY / h) * BASE_H)),
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
      sharedTouch.targetY = Math.max(0, touches[0].y - MOBILE_Y_OFFSET);
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
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback(
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
