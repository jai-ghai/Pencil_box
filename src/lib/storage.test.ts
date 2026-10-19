import { describe, expect, it } from "vitest";
import { cloudinaryPublicId, deleteProductImage } from "./storage";

describe("cloudinaryPublicId", () => {
  it("reads the id from our Cloudinary links", () => {
    expect(cloudinaryPublicId("https://res.cloudinary.com/demo/image/upload/v1792013980/pencilbox/abc123_X-y.jpg")).toBe("pencilbox/abc123_X-y");
    expect(cloudinaryPublicId("https://res.cloudinary.com/demo/image/upload/c_fill,w_400/v12/pencilbox/abc123.png")).toBe("pencilbox/abc123");
  });
  it("ignores links that are not ours", () => {
    expect(cloudinaryPublicId("https://example.com/pencilbox/abc.jpg")).toBeNull();
    expect(cloudinaryPublicId("https://res.cloudinary.com/demo/image/upload/v1/other-folder/abc.jpg")).toBeNull();
  });
});

describe("deleteProductImage", () => {
  it("does nothing for a foreign link and never throws", async () => {
    expect(await deleteProductImage("https://example.com/a.jpg")).toBe(false);
  });
});
