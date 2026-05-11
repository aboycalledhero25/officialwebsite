"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { SecretGameSettings } from "@/lib/data";
import { updateSecretGameSettings } from "@/lib/actions";
import { HotspotEditPanel } from "./hotspot-edit-panel";
import {
  Move,
  Eye,
  EyeOff,
  Gamepad2,
  Save,
  RotateCcw,
  Settings2,
  Maximize2,
  X,
} from "lucide-react";

type DragState =
  | { type: "idle" }
  | { type: "drag"; startX: number; startY: number; origX: number; origY: number }
  | { type: "resize"; handle: string; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number };

interface EditableHotspotProps {
  settings: SecretGameSettings;
  onNavigate: () => void;
}

export function EditableHotspot({ settings, onNavigate }: EditableHotspotProps) {
  const hs = settings.hotspot;
  const containerRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState({
    x: hs.x,
    y: hs.y,
    width: hs.width,
    height: hs.height,
  });

  const [showPanel, setShowPanel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dragState, setDragState] = useState<DragState>({ type: "idle" });
  const [previewMode, setPreviewMode] = useState(false);
  const dragRef = useRef<DragState>({ type: "idle" });

  // Reset draft when settings change externally
  useEffect(() => {
    setDraft({ x: hs.x, y: hs.y, width: hs.width, height: hs.height });
  }, [hs.x, hs.y, hs.width, hs.height]);

  const getContainerRect = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { width: window.innerWidth, height: window.innerHeight };
    const rect = el.parentElement?.getBoundingClientRect();
    return rect || { width: window.innerWidth, height: window.innerHeight };
  }, []);

  const pxToUnit = useCallback(
    (px: number, axis: "x" | "y") => {
      const rect = getContainerRect();
      const base = axis === "x" ? rect.width : rect.height;
      if (hs.unit === "%") return (px / base) * 100;
      return px;
    },
    [getContainerRect, hs.unit]
  );

  const startDrag = useCallback(
    (e: React.MouseEvent | React.TouchEvent, type: DragState["type"], handle?: string) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      e.preventDefault();
      e.stopPropagation();

      if (type === "drag") {
        const state: DragState = {
          type: "drag",
          startX: clientX,
          startY: clientY,
          origX: draft.x,
          origY: draft.y,
        };
        dragRef.current = state;
        setDragState(state);
      } else if (type === "resize" && handle) {
        const state: DragState = {
          type: "resize",
          handle,
          startX: clientX,
          startY: clientY,
          origX: draft.x,
          origY: draft.y,
          origW: draft.width,
          origH: draft.height,
        };
        dragRef.current = state;
        setDragState(state);
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

      const dx = pxToUnit(clientX - state.startX, "x");
      const dy = pxToUnit(clientY - state.startY, "y");

      if (state.type === "drag") {
        setDraft((prev) => ({
          ...prev,
          x: Math.max(0, Math.min(100 - prev.width, state.origX + dx)),
          y: Math.max(0, Math.min(100 - prev.height, state.origY + dy)),
        }));
      } else if (state.type === "resize") {
        setDraft((prev) => {
          let next = { ...prev };
          const minSize = hs.unit === "%" ? 1 : 10;

          if (state.handle.includes("e")) {
            next.width = Math.max(minSize, state.origW + dx);
          }
          if (state.handle.includes("w")) {
            const newW = Math.max(minSize, state.origW - dx);
            const diffW = state.origW - newW;
            next.width = newW;
            next.x = Math.max(0, state.origX + diffW);
          }
          if (state.handle.includes("s")) {
            next.height = Math.max(minSize, state.origH + dy);
          }
          if (state.handle.includes("n")) {
            const newH = Math.max(minSize, state.origH - dy);
            const diffH = state.origH - newH;
            next.height = newH;
            next.y = Math.max(0, state.origY + diffH);
          }
          return next;
        });
      }
    },
    [pxToUnit, hs.unit]
  );

  const onMove = useCallback(
    (e: MouseEvent) => applyMove(e.clientX, e.clientY),
    [applyMove]
  );
  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      applyMove(e.touches[0].clientX, e.touches[0].clientY);
    },
    [applyMove]
  );

  const onEnd = useCallback(() => {
    dragRef.current = { type: "idle" };
    setDragState({ type: "idle" });
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onEnd);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onEnd);
  }, [onMove, onTouchMove]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    const next = {
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
    } finally {
      setIsSaving(false);
    }
  }, [settings, hs, draft]);

  const handleReset = useCallback(() => {
    setDraft({ x: hs.x, y: hs.y, width: hs.width, height: hs.height });
  }, [hs]);

  const isDirty =
    Math.abs(draft.x - hs.x) > 0.01 ||
    Math.abs(draft.y - hs.y) > 0.01 ||
    Math.abs(draft.width - hs.width) > 0.01 ||
    Math.abs(draft.height - hs.height) > 0.01;

  const isDragging = dragState.type !== "idle";

  return (
    <div
      ref={containerRef}
      className="absolute"
      style={{
        left: `${draft.x}${hs.unit}`,
        top: `${draft.y}${hs.unit}`,
        width: `${draft.width}${hs.unit}`,
        height: `${draft.height}${hs.unit}`,
        zIndex: hs.zIndex,
      }}
    >
      {/* Hotspot body */}
      <div
        className={`absolute inset-0 cursor-move select-none transition-colors ${
          previewMode
            ? hs.hoverStyle === "outline"
              ? "border-2 border-dashed border-[#ff006e]/50"
              : hs.hoverStyle === "subtle"
              ? "hover:bg-[#ff006e]/10"
              : "opacity-0"
            : "border-2 border-dashed border-[#ff006e] bg-[#ff006e]/15"
        }`}
        onMouseDown={(e) => !previewMode && startDrag(e, "drag")}
        onTouchStart={(e) => !previewMode && startDrag(e, "drag")}
        onClick={(e) => {
          if (dragRef.current.type === "idle") onNavigate();
        }}
      >
        {/* Admin label (hidden in preview) */}
        {!previewMode && (
          <>
            <div className="absolute -top-7 left-0 flex items-center gap-1.5 text-[11px] font-bold text-[#ff006e] whitespace-nowrap bg-black/80 px-2 py-0.5 rounded">
              <Gamepad2 className="w-3 h-3" />
              <span>HOTSPOT</span>
              {hs.visibleToVisitors ? (
                <Eye className="w-3 h-3 text-[#00f0ff]" />
              ) : (
                <EyeOff className="w-3 h-3 text-neutral-400" />
              )}
            </div>

            {/* Center crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-full h-full">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-[#ff006e]/30" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#ff006e]/30" />
                <Move className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-[#ff006e]/50" />
              </div>
            </div>

            {/* Dimension readout */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-[10px] text-neutral-300 px-2 py-0.5 rounded whitespace-nowrap font-mono">
              {draft.x.toFixed(1)},{draft.y.toFixed(1)} &middot; {draft.width.toFixed(1)}
              &times;{draft.height.toFixed(1)}
              {hs.unit}
            </div>
          </>
        )}
      </div>

      {/* Resize handles (admin only) */}
      {!previewMode &&
        ["nw", "n", "ne", "w", "e", "sw", "s", "se"].map((h) => (
          <div
            key={h}
            className={`absolute flex items-center justify-center z-20 transition-transform ${
              isDragging ? "scale-110" : "hover:scale-125"
            }`}
            style={{
              width: 16,
              height: 16,
              top: h.includes("n") ? -8 : h.includes("s") ? "calc(100% - 8px)" : "calc(50% - 8px)",
              left: h.includes("w") ? -8 : h.includes("e") ? "calc(100% - 8px)" : "calc(50% - 8px)",
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
            <div className="w-3 h-3 rounded-sm bg-[#ff006e] border-2 border-white shadow-md" />
          </div>
        ))}

      {/* Floating toolbar */}
      {!previewMode && (
        <div className="absolute top-full left-0 mt-8 flex flex-col gap-2">
          {/* Action row */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-bold transition-colors ${
                isDirty
                  ? "bg-[#00f0ff] text-black hover:brightness-110"
                  : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
              }`}
            >
              <Save className="w-3 h-3" />
              {isSaving ? "Saving..." : "Save"}
            </button>

            {isDirty && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-bold border border-neutral-600 text-neutral-300 hover:border-[#ff006e] hover:text-[#ff006e] transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Cancel
              </button>
            )}

            <button
              onClick={() => setPreviewMode((p) => !p)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-bold border transition-colors ${
                previewMode
                  ? "border-[#00f0ff] text-[#00f0ff] bg-[#00f0ff]/10"
                  : "border-neutral-600 text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>

            <button
              onClick={() => setShowPanel((s) => !s)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-bold border border-neutral-600 text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              <Settings2 className="w-3 h-3" />
              {showPanel ? "Close" : "Settings"}
            </button>
          </div>

          {/* Quick numeric inputs */}
          {showPanel && (
            <div className="flex items-center gap-1.5">
              <MiniInput
                label="X"
                value={draft.x}
                onChange={(v) => setDraft((p) => ({ ...p, x: v }))}
              />
              <MiniInput
                label="Y"
                value={draft.y}
                onChange={(v) => setDraft((p) => ({ ...p, y: v }))}
              />
              <MiniInput
                label="W"
                value={draft.width}
                onChange={(v) => setDraft((p) => ({ ...p, width: v }))}
              />
              <MiniInput
                label="H"
                value={draft.height}
                onChange={(v) => setDraft((p) => ({ ...p, height: v }))}
              />
              <span className="text-[10px] text-neutral-500 font-mono">{hs.unit}</span>
            </div>
          )}

          {/* Settings panel */}
          {showPanel && (
            <HotspotEditPanel
              settings={settings}
              onUpdate={(next) => {
                // Update local state to match saved values without reload
                setDraft({
                  x: next.hotspot.x,
                  y: next.hotspot.y,
                  width: next.hotspot.width,
                  height: next.hotspot.height,
                });
              }}
            />
          )}
        </div>
      )}

      {/* Preview mode indicator */}
      {previewMode && (
        <div className="absolute top-full left-0 mt-2">
          <button
            onClick={() => setPreviewMode(false)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 hover:bg-[#00f0ff]/20 transition-colors"
          >
            <X className="w-3 h-3" />
            Exit Preview
          </button>
        </div>
      )}
    </div>
  );
}

function MiniInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] text-neutral-500 font-bold">{label}</span>
      <input
        type="number"
        value={value.toFixed(1)}
        step={0.1}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-12 bg-[#0a0a0a] border border-[#1e1e1e] rounded px-1 py-0.5 text-[10px] text-white text-center font-mono outline-none focus:border-[#00f0ff]"
      />
    </div>
  );
}
