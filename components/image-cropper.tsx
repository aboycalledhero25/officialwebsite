"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, ZoomIn, ZoomOut, RotateCcw, Check } from "lucide-react";

interface ImageCropperProps {
  file: File | null;
  aspectRatio?: number;
  onCropComplete: (path: string) => void;
  onCancel: () => void;
}

function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No canvas context"));
        return;
      }
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas is empty"));
      }, "image/jpeg", 0.92);
    };
    image.onerror = reject;
  });
}

export function ImageCropper({
  file,
  aspectRatio = 16 / 9,
  onCropComplete,
  onCancel,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const imageUrl = file ? URL.createObjectURL(file) : "";

  const onCropCompleteInternal = useCallback(
    (_: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageUrl) return;
    setUploading(true);
    try {
      const blob = await getCroppedImg(imageUrl, croppedAreaPixels);
      const formData = new FormData();
      formData.append(
        "file",
        new File([blob], "cropped-banner.jpg", { type: "image/jpeg" })
      );

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (result.path) {
        onCropComplete(result.path);
      } else {
        throw new Error("Upload failed");
      }
    } catch (e) {
      alert("Failed to upload cropped image.");
    } finally {
      setUploading(false);
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    }
  };

  const handleCancel = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    onCancel();
  };

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-xl tracking-wide text-foreground">
            CROP IMAGE
          </h3>
          <button
            onClick={handleCancel}
            className="rounded-md p-2 text-muted hover:bg-surface-elevated hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cropper */}
        <div className="relative flex-1 overflow-hidden bg-black" style={{ minHeight: "50vh" }}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={setZoom}
            showGrid={true}
            style={{
              containerStyle: {
                background: "#000",
              },
              cropAreaStyle: {
                border: "2px solid #00f0ff",
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.7)",
              },
            }}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-center gap-2 border-b border-border px-5 py-3">
          <button
            onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
            className="rounded-lg border border-border bg-background p-2.5 text-muted transition-colors hover:border-accent hover:text-accent"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-32 accent-accent"
          />
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            className="rounded-lg border border-border bg-background p-2.5 text-muted transition-colors hover:border-accent hover:text-accent"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={rotate}
            className="rounded-lg border border-border bg-background p-2.5 text-muted transition-colors hover:border-accent hover:text-accent"
            title="Rotate 90°"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4">
          <button
            onClick={handleCancel}
            className="rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-background transition-all hover:brightness-110 disabled:opacity-50"
          >
            <Check size={16} />
            {uploading ? "Uploading..." : "Crop & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
