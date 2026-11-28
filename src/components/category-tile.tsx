import Link from "next/link";
import { HOME_DRAWING } from "@/components/home-drawings";
import { cloudinarySquare, isCloudinary } from "@/lib/images";

/** Short line under the name when the shelf has no subtitle of its own. */
export const SHELF_LINE: Record<string, string> = {
  notebooks: "Copies and registers",
  pens: "Pens and pencils",
  school: "For the school bag",
  writing: "Pencil and eraser",
  office: "Stapler and files",
  paper: "A stack of sheets",
  art: "Brushes and colours",
  tapes: "Tape and glue",
  gifts: "A wrapped gift",
  toys: "A teddy and blocks",
  printing: "Printer and a page",
  "pencil-box": "A tin for pencils",
  "pencil-pouch": "Zip pouch",
  "geometry-box": "Box and compass",
  "scale-ruler": "A scale",
  "exam-pad": "Writing board",
  "bottle-lunch": "Bottle and box",
  "slate-duster": "Slate and duster",
  highlighter: "A highlighter",
  marker: "Markers",
  "sketch-pens": "A fan of pens",
  "correction-tape": "Correction tape",
  calculator: "A calculator",
  "files-folders": "Files and folders",
  "sticky-notes": "Sticky notes",
  "pins-clips": "Pins and clips",
  stapler: "A stapler",
  "office-diary": "A desk diary",
  "pen-stand": "A pen cup",
  "cutter-scissors": "Scissors",
  "lcd-tablet": "A writing tablet",
  "cello-tape": "A tape roll",
  "glue-gun": "A glue gun",
  "a4-paper": "A4 sheets",
  "craft-card": "Craft card",
  "drawing-book": "A sketchbook",
  "colouring-book": "A colouring book",
  "gift-wrap": "Wrapping paper",
  "paint-brushes": "Paint brushes",
  "modelling-clay": "Clay",
  "craft-stickers": "Stickers",
  "ice-cream-sticks": "Craft sticks",
  "craft-thread": "Thread and ribbon",
  "science-kits": "A small kit",
  "fancy-diary": "A gift diary",
  "gift-sets": "Ready sets",
  balloons: "Balloons",
  keychains: "Keychains",
  slime: "Slime",
  puzzles: "A puzzle",
  sports: "Ball and rope",
  locks: "A small lock",
  "nail-cutter": "A nail cutter",
};

export function shelfArt(slug: string, image: string): string {
  if (!image) return HOME_DRAWING[slug] ?? `/category/${slug}.svg`;
  return isCloudinary(image) ? cloudinarySquare(image, 400) : image;
}

/** Drawing or uploaded photo, centred on a soft navy circle. */
export function CategoryTile({
  href,
  label,
  slug,
  image = "",
  subtitle = "",
  priority = false,
}: {
  href: string;
  label: string;
  slug: string;
  image?: string;
  subtitle?: string;
  priority?: boolean;
}) {
  const line = subtitle || SHELF_LINE[slug] || "";
  return (
    <Link
      href={href}
      className="group flex h-full flex-col items-center rounded-[14px] border border-black/10 bg-white px-2 pb-3 pt-3 no-underline shadow-[0_1px_2px_rgba(12,18,34,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(21,58,122,0.12)]"
    >
      <span className="flex aspect-square w-[72%] max-w-[92px] items-center justify-center rounded-full bg-[#153a7a]/10 xl:max-w-[84px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shelfArt(slug, image)}
          alt=""
          width={160}
          height={160}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className="h-[82%] w-[82%] object-contain"
        />
      </span>
      <span className="mt-2 text-center text-[11px] font-extrabold uppercase leading-tight tracking-wide text-[#0c1222]">{label}</span>
      {line ? <span className="mt-0.5 line-clamp-2 text-center text-[10px] leading-snug text-[#5a6a82]">{line}</span> : null}
    </Link>
  );
}
