import { describe, expect, it } from "vitest";
import { cloudinarySquare } from "./images";

describe("cloudinary square", () => {
  it("pads a cloudinary photo onto a white square", () => {
    const url = cloudinarySquare("https://res.cloudinary.com/demo/image/upload/v1/pencilbox/a.jpg");
    expect(url).toBe("https://res.cloudinary.com/demo/image/upload/c_pad,b_white,ar_1:1,w_400,f_auto,q_auto/v1/pencilbox/a.jpg");
    expect(url).not.toContain("e_background_removal");
  });

  it("leaves a local drawing alone", () => {
    expect(cloudinarySquare("/category/pencil.svg")).toBe("/category/pencil.svg");
  });
});
