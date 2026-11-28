import { describe, expect, it } from "vitest";
import { productJsonLd, productSeo } from "./product-json";
import type { StoreProduct } from "./store";

function product(name: string, brand: string, price: number): StoreProduct {
  return {
    id: "1", name_en: name, name_hi: "", brand, brandId: "", categoryId: "c",
    image: "https://res.cloudinary.com/demo/image/upload/v1/pencilbox/a.jpg",
    images: ["https://res.cloudinary.com/demo/image/upload/v1/pencilbox/a.jpg"],
    imageGeneric: false, slug: "notebook-20", description_en: "", createdAt: 0,
    variants: [{ id: "v", code: "NB-01", label: "", price, maxPrice: 0, maxQty: 9, low: false, offers: [], mrp: 0 }],
  };
}

describe("product page seo", () => {
  it("names the card without the brand", () => {
    const seo = productSeo(product("Akash Notebook", "Akash", 2000));
    expect(seo.name).toBe("Notebook");
    expect(seo.title).toBe("Notebook ₹20 – Pencil Box, Tigri Extension");
    expect(seo.description).not.toMatch(/Akash/);
    const data = productJsonLd(product("Akash Notebook", "Akash", 2000));
    expect(data.name).toBe("Notebook");
    expect(data).not.toHaveProperty("brand");
    expect(data.offers).toMatchObject({ priceCurrency: "INR", price: "20", availability: "https://schema.org/InStock" });
  });
});
