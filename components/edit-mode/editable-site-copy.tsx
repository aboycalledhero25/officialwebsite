"use client";

import { EditableText } from "./editable-text";
import { updateSiteCopyPath } from "@/lib/actions";

interface Props {
  path: string;
  value: string;
  multiline?: boolean;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p" | "div";
}

export function EditableSiteCopy({ path, value, multiline, className, as }: Props) {
  return (
    <EditableText
      value={value}
      onSave={(v) => updateSiteCopyPath(path, v)}
      multiline={multiline}
      className={className}
      as={as}
    />
  );
}
