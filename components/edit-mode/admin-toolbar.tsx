"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Pencil,
  Eye,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { useEditMode } from "./edit-mode-provider";

export function AdminToolbar() {
  const { isEditMode, toggleEditMode } = useEditMode();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-[#1e1e1e] bg-[#141414]/95 backdrop-blur px-3 py-2 shadow-2xl">
        <button
          onClick={toggleEditMode}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            isEditMode
              ? "bg-[#00f0ff]/10 text-[#00f0ff]"
              : "text-neutral-400 hover:text-white hover:bg-[#1e1e1e]"
          }`}
        >
          {isEditMode ? <Eye className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          {isEditMode ? "Preview" : "Edit Mode"}
        </button>

        <div className="w-px h-4 bg-[#1e1e1e]" />

        <Link
          href="/admin"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white hover:bg-[#1e1e1e] transition-colors"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Dashboard
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log out
        </button>
      </div>
    </div>
  );
}
