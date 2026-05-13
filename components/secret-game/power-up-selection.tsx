"use client";

/**
 * POWER-UP SELECTION OVERLAY
 * ───────────────────────────
 * Shown after every boss defeat. Presents 3 randomised permanent upgrade
 * choices. Each card shows: icon, name, description, current stat, and the
 * improved stat after selecting (highlighted in green).
 *
 * Keyboard controls: W / ↑ move up, S / ↓ move down, Space confirms.
 */

import { useState, useEffect } from "react";
import { getPowerUp } from "./power-up-registry";
import type { PermPowerUpState } from "./player-stats";
import { sharedKeys } from "./use-keyboard-controls";

// ─── Single choice card ───────────────────────────────────────────────────────

interface PowerUpChoiceCardProps {
  powerUpId: string;
  chosen: PermPowerUpState;
  onSelect: (id: string) => void;
  /** Whether this card is the keyboard-highlighted option */
  selected?: boolean;
}

function PowerUpChoiceCard({ powerUpId, chosen, onSelect, selected = false }: PowerUpChoiceCardProps) {
  const def = getPowerUp(powerUpId);
  if (!def) return null;

  const stackCount = chosen[powerUpId] ?? 0;
  const currentStat = def.getCurrentStat(chosen);
  const nextStat    = def.getNextStat(chosen);

  return (
    <button
      onClick={() => onSelect(powerUpId)}
      className={[
        "w-full text-left p-4 rounded border-2 transition-all active:scale-95 focus:outline-none",
        selected
          ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_12px_rgba(252,238,10,0.35)]"
          : "border-white/20 bg-black/60 hover:bg-white/10 hover:border-yellow-400/70",
      ].join(" ")}
    >
      {/* Icon + Name */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 flex-shrink-0 rounded border border-white/20 bg-white/5 flex items-center justify-center overflow-hidden"
          style={{ imageRendering: "pixelated" }}
        >
          <img
            src={def.icon}
            alt={def.name}
            width={32}
            height={32}
            style={{ imageRendering: "pixelated" }}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = "none";
              const parent = img.parentElement;
              if (parent && !parent.querySelector(".pu-fallback")) {
                const span = document.createElement("span");
                span.className = "pu-fallback text-white text-sm font-bold";
                span.textContent = def.name[0];
                parent.appendChild(span);
              }
            }}
          />
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-tight font-mono">{def.name}</div>
          {stackCount > 0 && (
            <div className="text-yellow-400 text-xs font-mono">Stack {stackCount + 1}</div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-white/55 text-xs mb-3 leading-relaxed font-mono">{def.description}</p>

      {/* Stat preview */}
      <div className="space-y-1 text-xs font-mono">
        <div>
          <span className="text-white/40">Current: </span>
          <span className="text-white/70">{currentStat}</span>
        </div>
        <div>
          <span className="text-white/40">After: </span>
          <span className="text-green-400 font-bold">{nextStat}</span>
        </div>
      </div>
    </button>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export interface PowerUpSelectionProps {
  choices: string[];
  chosen: PermPowerUpState;
  onSelect: (id: string) => void;
  /** Heading shown at the top of the overlay. Defaults to "BOSS DEFEATED!" */
  title?: string;
}

export function PowerUpSelection({ choices, chosen, onSelect, title = "BOSS DEFEATED!" }: PowerUpSelectionProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Clamp selectedIdx whenever the choice list changes
  useEffect(() => {
    setSelectedIdx(0);
  }, [choices]);

  // On mount: clear any movement / shoot keys that may have been held during
  // gameplay so they don't fire the moment the reward screen closes.
  useEffect(() => {
    sharedKeys.up    = false;
    sharedKeys.down  = false;
    sharedKeys.shoot = false;
  }, []);

  // Keyboard navigation: W/↑ = up, S/↓ = down, Space = confirm.
  // Use capture so the event is intercepted before the global game handler.
  useEffect(() => {
    const count = choices.length;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        sharedKeys.up = false;
        setSelectedIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        sharedKeys.down = false;
        setSelectedIdx((i) => Math.min(count > 0 ? count - 1 : 0, i + 1));
      } else if (e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        sharedKeys.shoot = false;
        if (count > 0) {
          onSelect(choices[selectedIdx] ?? "");
        } else {
          onSelect("");
        }
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [choices, selectedIdx, onSelect]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div
        className="w-full max-w-md px-4 py-6 flex flex-col items-center gap-4"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="text-center">
          <h2
            className="text-yellow-400 font-black text-lg tracking-widest uppercase"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              textShadow: "0 0 20px rgba(252,238,10,0.6)",
            }}
          >
            {title}
          </h2>
          <p className="text-white/50 text-xs mt-2 font-mono tracking-wider">
            Choose a permanent upgrade
          </p>
          <p className="text-white/30 text-xs mt-1 font-mono">
            W / S to navigate &nbsp;·&nbsp; Space to select
          </p>
        </div>

        {/* Choice cards */}
        <div className="w-full flex flex-col gap-3">
          {choices.length > 0 ? (
            choices.map((id, idx) => (
              <PowerUpChoiceCard
                key={id}
                powerUpId={id}
                chosen={chosen}
                onSelect={onSelect}
                selected={idx === selectedIdx}
              />
            ))
          ) : (
            <>
              <p className="text-white/40 text-center text-sm font-mono py-2">
                No upgrades available.
              </p>
              <button
                onClick={() => onSelect("")}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded font-mono transition-all"
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
