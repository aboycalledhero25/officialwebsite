"use client";

import { useRouter } from "next/navigation";
import { useSiteData } from "@/components/data-provider";
import { useEditMode } from "@/components/edit-mode/edit-mode-provider";
import { EditableHotspot } from "./editable-hotspot";

export function HomepageSecretHotspot() {
  const data = useSiteData();
  const router = useRouter();
  const { isEditMode } = useEditMode();
  const settings = data.secretGame;

  if (!settings?.enabled || !settings.hotspot?.enabled) return null;

  const hs = settings.hotspot;
  const isVisible = hs.visibleToVisitors || isEditMode;

  const goToGame = () => router.push("/secret-game");

  // In edit mode, render the editable wrapper
  if (isEditMode) {
    return <EditableHotspot settings={settings} onNavigate={goToGame} />;
  }

  // Normal visitor view
  return (
    <button
      onClick={goToGame}
      className="absolute cursor-pointer min-w-[44px] min-h-[44px]"
      style={{
        left: `${hs.x}${hs.unit}`,
        top: `${hs.y}${hs.unit}`,
        width: `${hs.width}${hs.unit}`,
        height: `${hs.height}${hs.unit}`,
        zIndex: hs.zIndex,
        opacity: isVisible ? undefined : 0,
      }}
      aria-label={hs.tooltip || "Hidden game"}
      tabIndex={isVisible ? 0 : -1}
      title={hs.tooltip || undefined}
    >
      {isVisible && hs.hoverStyle !== "hidden" && (
        <div
          className={`w-full h-full transition-colors ${
            hs.hoverStyle === "outline"
              ? "border-2 border-dashed border-[#ff006e]/40 hover:border-[#ff006e]/80"
              : hs.hoverStyle === "subtle"
              ? "hover:bg-[#ff006e]/10"
              : ""
          }`}
        />
      )}
    </button>
  );
}
