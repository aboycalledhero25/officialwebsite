"use client";

import { GuitarBackground } from "./guitar-background";
import { useBackgroundConfig } from "./background-config";

interface Props {
  isAdmin: boolean;
  defaultColors: { stratColor: string; jaguarColor: string };
}

export function GuitarBackgroundWrapper({ isAdmin, defaultColors }: Props) {
  const { showFloatingGuitars } = useBackgroundConfig();
  return (
    <GuitarBackground
      showFloatingGuitars={showFloatingGuitars}
      isAdmin={isAdmin}
      defaultColors={defaultColors}
    />
  );
}
