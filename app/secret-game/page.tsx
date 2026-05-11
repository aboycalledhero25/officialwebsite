"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RetroArcadeGame } from "@/components/secret-game/retro-arcade-game";
import { useBackgroundConfig } from "@/components/background-config";
import { useSiteData } from "@/components/data-provider";
import { ArrowLeft } from "lucide-react";

export default function SecretGamePage() {
  const router = useRouter();
  const { setShowFloatingGuitars } = useBackgroundConfig();
  const data = useSiteData();
  const game = data.secretGame;

  // Hide floating guitars while on this page
  useEffect(() => {
    setShowFloatingGuitars(false);
    return () => setShowFloatingGuitars(true);
  }, [setShowFloatingGuitars]);

  if (!game?.enabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-neutral-400">
        <p className="text-lg">The secret game is currently disabled.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-4 py-2 rounded-lg bg-[#00f0ff] text-black font-bold text-sm hover:brightness-110 transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-50">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/60 border border-white/20 text-white text-sm backdrop-blur-sm hover:bg-black/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Game — fills the entire viewport */}
      <RetroArcadeGame
        title={game.title}
        instructions={game.instructions}
        onClose={() => router.push("/")}
      />
    </div>
  );
}
