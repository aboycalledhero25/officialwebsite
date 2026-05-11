"use client";

import { useEffect, useRef } from "react";
import { useGameModal } from "./game-modal-provider";
import { useBackgroundConfig } from "@/components/background-config";
import { RetroArcadeGame } from "./retro-arcade-game";
import { X } from "lucide-react";

interface GameModalProps {
  title: string;
  instructions: string;
}

export function GameModal({ title, instructions }: GameModalProps) {
  const { isOpen, close } = useGameModal();
  const { setShowFloatingGuitars } = useBackgroundConfig();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Toggle background guitars
  useEffect(() => {
    if (isOpen) {
      setShowFloatingGuitars(false);
      // Focus close button on open
      setTimeout(() => closeBtnRef.current?.focus(), 50);
    } else {
      setShowFloatingGuitars(true);
    }
  }, [isOpen, setShowFloatingGuitars]);

  // Escape is handled by RetroArcadeGame (pause first, then close)

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    const modal = modalRef.current;
    if (!modal) return;

    const focusable = () =>
      Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const elements = focusable();
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    modal.addEventListener("keydown", handleTab);
    return () => modal.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-sm"
    >
      {/* Close button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          ref={closeBtnRef}
          onClick={close}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          aria-label="Close game"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Game */}
      <div className="flex-1 flex items-center justify-center p-4">
        <RetroArcadeGame title={title} instructions={instructions} onClose={close} />
      </div>
    </div>
  );
}
