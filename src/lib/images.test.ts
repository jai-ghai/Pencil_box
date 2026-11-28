import { describe, expect, it } from "vitest";
import { cloudinaryBlur, cloudinarySquare, cloudinarySrcSet } from "./images";

describe("cloudinary square", () => {
  it("pads a cloudinary photo onto a white square", () => {
    const url = cloudinarySquare("https://res.cloudinary.com/demo/image/upload/v1/pencilbox/a.jpg");
    expect(url).toBe("https://res.cloudinary.com/demo/image/upload/e_trim:8,c_pad,b_auto,ar_1:1,w_400,e_improve,f_auto,q_auto/v1/pencilbox/a.jpg");
    expect(url).not.toContain("e_background_removal");
  });

  it("leaves a local drawing alone", () => {
    expect(cloudinarySquare("/category/pencil.svg")).toBe("/category/pencil.svg");
    expect(cloudinarySrcSet("/category/pencil.svg")).toBeUndefined();
    expect(cloudinaryBlur("/category/pencil.svg")).toBeUndefined();
  });

  it("offers a small blurred stand-in and a srcset", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1/pencilbox/a.jpg";
    expect(cloudinaryBlur(url)).toContain("e_blur:200");
    expect(cloudinarySrcSet(url)).toContain(" 200w");
    expect(cloudinarySrcSet(url)).toContain(" 800w");
    expect(cloudinarySrcSet(url)).toContain(" 1200w");
  });
});
