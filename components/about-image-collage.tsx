import { Users } from "lucide-react";
import { EditableAboutImage } from "@/components/edit-mode/editable-about-image";

export interface AboutImage {
  src: string;
  alt: string;
  span?: "square" | "wide" | "tall" | "large";
}

interface AboutImageCollageProps {
  images: AboutImage[];
  columns?: 2 | 3 | 4;
  gap?: "small" | "medium" | "large";
}

const gapClasses = {
  small: "gap-2",
  medium: "gap-4",
  large: "gap-6",
};

const colClasses = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

function getSpanClasses(span?: AboutImage["span"]) {
  switch (span) {
    case "wide":
      return "col-span-2 aspect-[3/2]";
    case "tall":
      return "row-span-2 aspect-[3/4]";
    case "large":
      return "col-span-2 row-span-2 aspect-square";
    case "square":
    default:
      return "aspect-square";
  }
}

export function AboutImageCollage({
  images,
  columns = 2,
  gap = "medium",
}: AboutImageCollageProps) {
  if (images.length === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-surface sm:col-span-2">
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-elevated to-background">
            <span className="text-center">
              <Users size={32} className="mx-auto text-muted" />
              <span className="mt-2 block text-sm uppercase tracking-widest text-muted">
                Add images in the admin dashboard
              </span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid ${gapClasses[gap]} ${colClasses[columns]}`}>
      {images.map((image, index) => (
        <div
          key={`${image.src}-${index}`}
          className={`relative overflow-hidden rounded-2xl border border-border bg-surface ${getSpanClasses(
            image.span
          )}`}
        >
          <EditableAboutImage
            index={index}
            src={image.src}
            alt={image.alt}
            imgClassName="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          />
        </div>
      ))}
    </div>
  );
}
