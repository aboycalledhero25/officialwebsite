"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RetroArcadeGame } from "@/components/secret-game/retro-arcade-game";
import { useBackgroundConfig } from "@/components/background-config";
import { useSiteData } from "@/components/data-provider";


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

      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Game — fills the entire viewport */}
      <RetroArcadeGame
        title={game.title}
        instructions={game.instructions}
        onClose={() => router.push("/")}
      />
    </div>
  );
}
