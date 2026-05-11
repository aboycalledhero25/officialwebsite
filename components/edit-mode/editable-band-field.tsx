"use client";

import { EditableText } from "./editable-text";
import { updateBandField } from "@/lib/actions";

interface Props {
  field: string;
  value: string;
  multiline?: boolean;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p" | "div";
}

export function EditableBandField({ field, value, multiline, className, as }: Props) {
  return (
    <EditableText
      value={value}
      onSave={(v) => updateBandField(field, v)}
      multiline={multiline}
      className={className}
      as={as}
    />
  );
}
