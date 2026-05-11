"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface BackgroundConfig {
  showFloatingGuitars: boolean;
  setShowFloatingGuitars: (v: boolean) => void;
}

const BackgroundConfigContext = createContext<BackgroundConfig>({
  showFloatingGuitars: true,
  setShowFloatingGuitars: () => {},
});

export function BackgroundConfigProvider({ children }: { children: ReactNode }) {
  const [showFloatingGuitars, setShowFloatingGuitars] = useState(true);

  return (
    <BackgroundConfigContext.Provider value={{ showFloatingGuitars, setShowFloatingGuitars }}>
      {children}
    </BackgroundConfigContext.Provider>
  );
}

export function useBackgroundConfig() {
  return useContext(BackgroundConfigContext);
}
