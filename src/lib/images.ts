/**
 * Uniform square product photos on white.
 * Background removal (`e_background_removal`) is not applied: it is a paid Cloudinary add-on
 * and this project has no credentials here to confirm the account has it.
 */
export function cloudinarySquare(url: string, width = 400): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/c_pad,b_white,ar_1:1,w_${width},f_auto,q_auto/`);
}
