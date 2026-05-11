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
  const mouseDownRef = useRef(false);

  // Convert screen pixel to base game coordinates
  const screenToBase = useCallback((clientX: number, clientY: number) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return {
      x: Math.max(0, Math.min(BASE_W, (clientX / w) * BASE_W)),
      y: Math.max(0, Math.min(BASE_H, (clientY / h) * BASE_H)),
    };
  }, []);

  const updateSharedState = useCallback(() => {
    const touches = Array.from(activeTouches.current.values());
    if (touches.length === 0 && !mouseDownRef.current) {
      sharedTouch.targetX = null;
      sharedTouch.targetY = null;
      sharedAim.x = null;
      sharedAim.y = null;
      sharedAim.firing = false;
    } else if (touches.length > 0) {
      // First touch = movement target
      sharedTouch.targetX = touches[0].x;
      sharedTouch.targetY = Math.max(0, touches[0].y - MOBILE_Y_OFFSET);
      // Second touch = aim, otherwise first touch = aim
      const aimTouch = touches.length >= 2 ? touches[1] : touches[0];
      sharedAim.x = aimTouch.x;
      sharedAim.y = aimTouch.y;
      sharedAim.firing = true;
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
      updateSharedState();
    },
    [screenToBase, updateSharedState]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const pos = screenToBase(t.clientX, t.clientY);
        activeTouches.current.set(t.identifier, pos);
      }
      updateSharedState();
    },
    [screenToBase, updateSharedState]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        activeTouches.current.delete(t.identifier);
      }
      updateSharedState();
    },
    [updateSharedState]
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

  const handleMouseDown = useCallback(() => {
    mouseDownRef.current = true;
    sharedAim.firing = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    mouseDownRef.current = false;
    sharedAim.firing = false;
  }, []);

  // Reset on unmount
  useEffect(() => {
    return () => {
      activeTouches.current.clear();
      mouseDownRef.current = false;
      sharedTouch.targetX = null;
      sharedTouch.targetY = null;
      sharedAim.x = null;
      sharedAim.y = null;
      sharedAim.firing = false;
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
    />
  );
}
