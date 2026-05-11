"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { SecretGameSettings } from "@/lib/data";
import { updateSecretGameSettings } from "@/lib/actions";
import {
  Move,
  Save,
  RotateCcw,
  MousePointer2,
  Maximize2,
  ArrowUpDown,
  ArrowLeftRight,
} from "lucide-react";

interface HotspotLiveEditorProps {
  settings: SecretGameSettings;
  onSave: (s: SecretGameSettings) => void;
}

type DragState =
  | { type: "idle" }
  | { type: "drag"; startX: number; startY: number; origX: number; origY: number }
  | { type: "resize"; handle: string; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number };

export function HotspotLiveEditor({ settings, onSave }: HotspotLiveEditorProps) {
  const hs = settings.hotspot;
  const frameRef = useRef<HTMLDivElement>(null);

  // Work in percentages for the editor
  const [draft, setDraft] = useState({
    x: hs.x,
    y: hs.y,
    width: hs.width,
    height: hs.height,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const dragRef = useRef<DragState>({ type: "idle" });

  // Sync when external settings change
  useEffect(() => {
    setDraft({ x: hs.x, y: hs.y, width: hs.width, height: hs.height });
  }, [hs.x, hs.y, hs.width, hs.height]);

  const getFrameRect = useCallback(() => {
    return frameRef.current?.getBoundingClientRect() || { width: 1, height: 1, left: 0, top: 0 };
  }, []);

  const pxToPct = useCallback(
    (pxX: number, pxY: number) => {
      const rect = getFrameRect();
      return {
        x: (pxX / rect.width) * 100,
        y: (pxY / rect.height) * 100,
      };
    },
    [getFrameRect]
  );

  const startDrag = useCallback(
    (e: React.MouseEvent | React.TouchEvent, type: DragState["type"], handle?: string) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      e.preventDefault();
      e.stopPropagation();

      if (type === "drag") {
        dragRef.current = {
          type: "drag",
          startX: clientX,
          startY: clientY,
          origX: draft.x,
          origY: draft.y,
        };
      } else if (type === "resize" && handle) {
        dragRef.current = {
          type: "resize",
          handle,
          startX: clientX,
          startY: clientY,
          origX: draft.x,
          origY: draft.y,
          origW: draft.width,
          origH: draft.height,
        };
        setActiveHandle(handle);
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onEnd);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onEnd);
    },
    [draft]
  );

  const applyMove = useCallback(
    (clientX: number, clientY: number) => {
      const state = dragRef.current;
      if (state.type === "idle") return;

      const rect = getFrameRect();
      const dxPct = ((clientX - state.startX) / rect.width) * 100;
      const dyPct = ((clientY - state.startY) / rect.height) * 100;

      if (state.type === "drag") {
        setDraft((prev) => ({
          ...prev,
          x: Math.max(0, Math.min(100 - prev.width, state.origX + dxPct)),
          y: Math.max(0, Math.min(100 - prev.height, state.origY + dyPct)),
        }));
      } else if (state.type === "resize") {
        setDraft((prev) => {
          let next = { ...prev };
          const minSize = 1;

          if (state.handle.includes("e")) {
            next.width = Math.max(minSize, Math.min(100 - next.x, state.origW + dxPct));
          }
          if (state.handle.includes("w")) {
            const newW = Math.max(minSize, state.origW - dxPct);
            const diffW = state.origW - newW;
            next.width = newW;
            next.x = Math.max(0, state.origX + diffW);
          }
          if (state.handle.includes("s")) {
            next.height = Math.max(minSize, Math.min(100 - next.y, state.origH + dyPct));
          }
          if (state.handle.includes("n")) {
            const newH = Math.max(minSize, state.origH - dyPct);
            const diffH = state.origH - newH;
            next.height = newH;
            next.y = Math.max(0, state.origY + diffH);
          }
          return next;
        });
      }
    },
    [getFrameRect]
  );

  const onMove = useCallback((e: MouseEvent) => applyMove(e.clientX, e.clientY), [applyMove]);
  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      applyMove(e.touches[0].clientX, e.touches[0].clientY);
    },
    [applyMove]
  );

  const onEnd = useCallback(() => {
    dragRef.current = { type: "idle" };
    setActiveHandle(null);
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onEnd);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onEnd);
  }, [onMove, onTouchMove]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    const next: SecretGameSettings = {
      ...settings,
      hotspot: {
        ...hs,
        x: Math.round(draft.x * 100) / 100,
        y: Math.round(draft.y * 100) / 100,
        width: Math.round(draft.width * 100) / 100,
        height: Math.round(draft.height * 100) / 100,
      },
    };
    try {
      await updateSecretGameSettings(next);
      onSave(next);
    } finally {
      setIsSaving(false);
    }
  }, [settings, hs, draft, onSave]);

  const handleReset = useCallback(() => {
    setDraft({ x: hs.x, y: hs.y, width: hs.width, height: hs.height });
  }, [hs]);

  const isDirty =
    Math.abs(draft.x - hs.x) > 0.01 ||
    Math.abs(draft.y - hs.y) > 0.01 ||
    Math.abs(draft.width - hs.width) > 0.01 ||
    Math.abs(draft.height - hs.height) > 0.01;

  const isDragging = dragRef.current.type !== "idle";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            isDirty
              ? "bg-[#00f0ff] text-black hover:brightness-110"
              : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? "Saving..." : "Save Position"}
        </button>

        {isDirty && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-neutral-600 text-neutral-300 hover:border-[#ff006e] hover:text-[#ff006e] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}

        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
            <ArrowLeftRight className="w-3 h-3" />
            <span>X: {draft.x.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
            <ArrowUpDown className="w-3 h-3" />
            <span>Y: {draft.y.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
            <Maximize2 className="w-3 h-3" />
            <span>
              {draft.width.toFixed(1)}% &times; {draft.height.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Live editor frame */}
      <div
        ref={frameRef}
        className="relative w-full rounded-xl border-2 border-dashed border-neutral-700 bg-neutral-900/50 overflow-hidden select-none"
        style={{ aspectRatio: "16/9", maxHeight: "500px" }}
      >
        {/* Mock homepage background */}
        <div className="absolute inset-0 opacity-30">
          <div className="h-full flex flex-col">
            <div className="h-8 bg-neutral-800 border-b border-neutral-700 flex items-center px-4 gap-4">
              <div className="w-20 h-3 bg-neutral-600 rounded" />
              <div className="flex-1" />
              <div className="w-8 h-3 bg-neutral-600 rounded" />
              <div className="w-8 h-3 bg-neutral-600 rounded" />
              <div className="w-8 h-3 bg-neutral-600 rounded" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-48 h-6 bg-neutral-700 rounded" />
              <div className="w-32 h-4 bg-neutral-700 rounded" />
              <div className="flex gap-2 mt-2">
                <div className="w-20 h-8 bg-neutral-700 rounded" />
                <div className="w-20 h-8 bg-neutral-700 rounded" />
              </div>
            </div>
            <div className="h-24 bg-neutral-800 border-t border-neutral-700" />
          </div>
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "10% 10%",
            }}
          />
        </div>

        {/* The hotspot */}
        <div
          className="absolute group"
          style={{
            left: `${draft.x}%`,
            top: `${draft.y}%`,
            width: `${draft.width}%`,
            height: `${draft.height}%`,
            zIndex: 10,
          }}
        >
          {/* Body */}
          <div
            className={`absolute inset-0 cursor-move transition-all ${
              isDragging
                ? "bg-[#ff006e]/25 border-2 border-[#ff006e]"
                : "bg-[#ff006e]/15 border-2 border-dashed border-[#ff006e] group-hover:bg-[#ff006e]/20"
            }`}
            onMouseDown={(e) => startDrag(e, "drag")}
            onTouchStart={(e) => startDrag(e, "drag")}
          >
            {/* Label */}
            <div className="absolute -top-7 left-0 flex items-center gap-1 text-[10px] font-bold text-[#ff006e] whitespace-nowrap bg-black/90 px-2 py-0.5 rounded border border-[#ff006e]/30">
              <MousePointer2 className="w-3 h-3" />
              <span>HOTSPOT</span>
            </div>

            {/* Center crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-full h-full">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-[#ff006e]/40" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#ff006e]/40" />
                <Move className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-[#ff006e]/60" />
              </div>
            </div>

            {/* Dimensions */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/90 text-[10px] text-neutral-300 px-2 py-0.5 rounded whitespace-nowrap font-mono border border-neutral-700">
              {draft.x.toFixed(1)},{draft.y.toFixed(1)} &middot; {draft.width.toFixed(1)}
              &times;{draft.height.toFixed(1)}%
            </div>
          </div>

          {/* Resize handles */}
          {["nw", "n", "ne", "w", "e", "sw", "s", "se"].map((h) => (
            <div
              key={h}
              className={`absolute flex items-center justify-center z-20 transition-transform ${
                activeHandle === h ? "scale-125" : "hover:scale-125"
              }`}
              style={{
                width: 20,
                height: 20,
                top: h.includes("n") ? -10 : h.includes("s") ? "calc(100% - 10px)" : "calc(50% - 10px)",
                left: h.includes("w") ? -10 : h.includes("e") ? "calc(100% - 10px)" : "calc(50% - 10px)",
                cursor:
                  h === "n" || h === "s"
                    ? "ns-resize"
                    : h === "e" || h === "w"
                    ? "ew-resize"
                    : h === "nw" || h === "se"
                    ? "nwse-resize"
                    : "nesw-resize",
              }}
              onMouseDown={(e) => startDrag(e, "resize", h)}
              onTouchStart={(e) => startDrag(e, "resize", h)}
            >
              <div className="w-3.5 h-3.5 rounded-sm bg-[#ff006e] border-2 border-white shadow-lg" />
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="absolute bottom-3 right-3 bg-black/80 text-[10px] text-neutral-400 px-2 py-1 rounded border border-neutral-700">
          Drag body to move &middot; Drag handles to resize
        </div>
      </div>

      {/* Quick inputs row */}
      <div className="grid grid-cols-4 gap-3">
        <QuickInput label="X (%)" value={draft.x} onChange={(v) => setDraft((p) => ({ ...p, x: Math.max(0, Math.min(100 - p.width, v)) }))} />
        <QuickInput label="Y (%)" value={draft.y} onChange={(v) => setDraft((p) => ({ ...p, y: Math.max(0, Math.min(100 - p.height, v)) }))} />
        <QuickInput label="Width (%)" value={draft.width} onChange={(v) => setDraft((p) => ({ ...p, width: Math.max(1, Math.min(100 - p.x, v)) }))} />
        <QuickInput label="Height (%)" value={draft.height} onChange={(v) => setDraft((p) => ({ ...p, height: Math.max(1, Math.min(100 - p.y, v)) }))} />
      </div>
    </div>
  );
}

function QuickInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium uppercase tracking-wider text-neutral-500 mb-1">
        {label}
      </label>
      <input
        type="number"
        value={value.toFixed(1)}
        step={0.1}
        min={0}
        max={100}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] font-mono"
      />
    </div>
  );
}
