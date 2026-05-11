"use client";

import { EditModeProvider } from "./edit-mode-provider";
import { AdminToolbar } from "./admin-toolbar";

export function AdminWrapper({
  children,
  isAdmin,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
}) {
  if (!isAdmin) return <>{children}</>;

  return (
    <EditModeProvider>
      {children}
      <AdminToolbar />
    </EditModeProvider>
  );
}
