"use client";

import { EditableText } from "./editable-text";
import { EditableImage } from "./editable-image";
import { updateReleaseField } from "@/lib/actions";

export function EditableReleaseText({
  id,
  field,
  value,
  multiline,
  className,
  as,
}: {
  id: string;
  field: string;
  value: string;
  multiline?: boolean;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p" | "div";
}) {
  return (
    <EditableText
      value={value}
      onSave={(v) => updateReleaseField(id, field, v)}
      multiline={multiline}
      className={className}
      as={as}
    />
  );
}

export function EditableReleaseImage({
  id,
  src,
  alt,
  imgClassName,
}: {
  id: string;
  src: string;
  alt: string;
  imgClassName?: string;
}) {
  return (
    <EditableImage
      src={src}
      alt={alt}
      imgClassName={imgClassName}
      onChange={(v) => updateReleaseField(id, "artwork", v)}
    />
  );
}
