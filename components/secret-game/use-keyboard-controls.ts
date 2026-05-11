"use client";

import { useEffect } from "react";

export interface KeyState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  shoot: boolean;
  pause: boolean;
  mute: boolean;
  escape: boolean;
}

// Shared mutable key state — both keyboard and touch controls write here.
export const sharedKeys: KeyState = {
  left: false,
  right: false,
  up: false,
  down: false,
  shoot: false,
  pause: false,
  mute: false,
  escape: false,
};

// Shared touch target for mobile follow-finger (null = no active touch)
export const sharedTouch = {
  targetX: null as number | null,
  targetY: null as number | null,
};

// Shared aim state — where the player is aiming (base coords) and whether firing
export const sharedAim = {
  x: null as number | null,
  y: null as number | null,
  firing: false,
  aiming: false, // true = directional aim toward x/y; false = straight up
};

function isTyping() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || (el as HTMLElement).isContentEditable;
}

export function useKeyboardControls() {
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (isTyping()) return;

      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          sharedKeys.left = true;
          e.preventDefault();
          break;
        case "ArrowRight":
        case "d":
        case "D":
          sharedKeys.right = true;
          e.preventDefault();
          break;
        case "ArrowUp":
        case "w":
        case "W":
          sharedKeys.up = true;
          e.preventDefault();
          break;
        case "ArrowDown":
        case "s":
        case "S":
          sharedKeys.down = true;
          e.preventDefault();
          break;
        case " ":
          sharedKeys.shoot = true;
          e.preventDefault();
          break;
        case "p":
        case "P":
          sharedKeys.pause = true;
          break;
        case "m":
        case "M":
          sharedKeys.mute = true;
          break;
        case "Escape":
          sharedKeys.escape = true;
          break;
      }
    };

    const handleUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          sharedKeys.left = false;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          sharedKeys.right = false;
          break;
        case "ArrowUp":
        case "w":
        case "W":
          sharedKeys.up = false;
          break;
        case "ArrowDown":
        case "s":
        case "S":
          sharedKeys.down = false;
          break;
        case " ":
          sharedKeys.shoot = false;
          break;
        case "p":
        case "P":
          sharedKeys.pause = false;
          break;
        case "m":
        case "M":
          sharedKeys.mute = false;
          break;
        case "Escape":
          sharedKeys.escape = false;
          break;
      }
    };

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, []);

  return sharedKeys;
}
