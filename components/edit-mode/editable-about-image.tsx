"use client";

import { EditableImage } from "./editable-image";
import { updateAboutImageField } from "@/lib/actions";

export function EditableAboutImage({
  index,
  src,
  alt,
  imgClassName,
}: {
  index: number;
  src: string;
  alt: string;
  imgClassName?: string;
}) {
  return (
    <EditableImage
      src={src}
      alt={alt}
      imgClassName={imgClassName}
      onChange={(v) => updateAboutImageField(index, "src", v)}
    />
  );
}
