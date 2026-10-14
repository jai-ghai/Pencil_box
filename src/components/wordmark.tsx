import Image from "next/image";

/** The shop wordmark from the poster (white PENCIL with the pencil as the I, yellow BOX). Made for the navy header. */
export function Wordmark({ size = 28 }: { size?: number }) {
  const height = Math.round(size * 1.25);
  const width = Math.round((height * 1470) / 256);
  return <Image src="/brand/wordmark.png" alt="Pencil Box" width={width} height={height} priority style={{ width, height }} />;
}
