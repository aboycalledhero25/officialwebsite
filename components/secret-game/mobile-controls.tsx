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
  const layerRef = useRef<HTMLDivElement>(null);
  // Mouse tracking is disabled briefly after mount so that the player doesn't snap to
  // wherever the cursor was when the power-up overlay was clicked.
  // Tracking auto-activates after a short grace period, so trackpad users
  // can move the player by simply moving their finger without clicking first.
  const mouseTrackingActive = useRef(false);
  const mountTimeRef = useRef(Date.now());
  // Toggle state: tracks whether left-click shooting is currently active.
  const firingToggle = useRef(false);
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

  // Mouse handlers (desktop + trackpad)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // After a 400 ms grace period following mount, auto-enable tracking on any
      // mouse/trackpad movement. This lets trackpad users just move their finger
      // to control the player without needing to click first, while still preventing
      // the player from snapping to the cursor position right after a power-up click.
      if (!mouseTrackingActive.current) {
        if (Date.now() - mountTimeRef.current < 400) return;
        mouseTrackingActive.current = true;
      }
      const pos = screenToBase(e.clientX, e.clientY);
      // Move the player toward the cursor (same mechanism as touch follow-finger)
      sharedTouch.targetX = pos.x;
      sharedTouch.targetY = pos.y;
      // Also update aim position
      sharedAim.x = pos.x;
      sharedAim.y = pos.y;
    },
    [screenToBase]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    unlockAudio();
    // Activate mouse-driven movement on first click so the player doesn't
    // teleport to where the cursor was during the power-up screen.
    mouseTrackingActive.current = true;
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button === 0) {
      // Left click: toggle shooting on/off.
      firingToggle.current = !firingToggle.current;
      sharedAim.firing = firingToggle.current;
      sharedAim.aiming = false;
    }
  }, []);

  // When the cursor leaves the game window, stop mouse-driven movement so the
  // player doesn't keep chasing a position that no longer updates.
  // Also reset the firing toggle so it doesn't persist unexpectedly.
  const handleMouseLeaveWindow = useCallback(() => {
    sharedTouch.targetX = null;
    sharedTouch.targetY = null;
    firingToggle.current = false;
    sharedAim.firing = false;
    sharedAim.aiming = false;
  }, []);

  // Reset on unmount
  useEffect(() => {
    return () => {
      activeTouches.current.clear();
      mouseTrackingActive.current = false;
      firingToggle.current = false;
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
      onMouseLeave={handleMouseLeaveWindow}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
