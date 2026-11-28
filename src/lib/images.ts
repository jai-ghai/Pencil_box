/**
 * Uniform square product photos on white.
 * Background removal (`e_background_removal`) is not applied: it is a paid Cloudinary add-on
 * and this project has no credentials here to confirm the account has it.
 */
export function isCloudinary(url: string): boolean {
  return url.includes("res.cloudinary.com") && url.includes("/upload/");
}

export function cloudinarySquare(url: string, width = 400): string {
  if (!isCloudinary(url)) return url;
  return url.replace("/upload/", `/upload/c_pad,b_white,ar_1:1,w_${width},f_auto,q_auto/`);
}

/** Tiny blurred stand-in. One cheap request, used only as a CSS background while the real file loads. */
export function cloudinaryBlur(url: string): string | undefined {
  if (!isCloudinary(url)) return undefined;
  return url.replace("/upload/", "/upload/c_pad,b_white,ar_1:1,w_32,e_blur:200,q_30,f_auto/");
}

export function cloudinarySrcSet(url: string, widths: number[] = [200, 400, 800]): string | undefined {
  if (!isCloudinary(url)) return undefined;
  return widths.map((w) => `${cloudinarySquare(url, w)} ${w}w`).join(", ");
}
