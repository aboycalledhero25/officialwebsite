"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";

interface EditModeContextValue {
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
  toggleEditMode: () => void;
}

const EditModeContext = createContext<EditModeContextValue>({
  isEditMode: false,
  setIsEditMode: () => {},
  toggleEditMode: () => {},
});

export function EditModeProvider({
  children,
  defaultEnabled = false,
}: {
  children: React.ReactNode;
  defaultEnabled?: boolean;
}) {
  const [isEditMode, setIsEditMode] = useState(defaultEnabled);

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
  }, []);

  return (
    <EditModeContext.Provider value={{ isEditMode, setIsEditMode, toggleEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  return useContext(EditModeContext);
}
