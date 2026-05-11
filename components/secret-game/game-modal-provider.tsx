"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface GameModalContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const GameModalContext = createContext<GameModalContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
});

export function GameModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <GameModalContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </GameModalContext.Provider>
  );
}

export function useGameModal() {
  return useContext(GameModalContext);
}
