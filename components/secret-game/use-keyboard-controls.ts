"use client";

import { useEffect } from "react";

export interface KeyState {
  left: boolean;
  right: boolean;
  shoot: boolean;
  powerUp: boolean;
  pause: boolean;
  mute: boolean;
  escape: boolean;
}

// Shared mutable key state — both keyboard and touch controls write here.
export const sharedKeys: KeyState = {
  left: false,
  right: false,
  shoot: false,
  powerUp: false,
  pause: false,
  mute: false,
  escape: false,
};

export function useKeyboardControls() {
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          sharedKeys.left = true;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          sharedKeys.right = true;
          break;
        case " ":
          sharedKeys.shoot = true;
          e.preventDefault();
          break;
        case "Control":
          sharedKeys.powerUp = true;
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
        case " ":
          sharedKeys.shoot = false;
          break;
        case "Control":
          sharedKeys.powerUp = false;
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
