import { describe, expect, it } from "vitest";
import { SERVICES } from "./seed-services";
import {
  AREAS_SERVED,
  COLLECTIONS,
  MAPS_URL,
  PHONE_SCHEMA,
  PRINT_RATES,
  SAME_AS,
  SHOP_NAME,
  categoryMatchFromPath,
  faqItems,
  storeJsonLd,
} from "./shop";

describe("local shop facts", () => {
  it("keeps photocopy prices aligned with the services catalogue", () => {
    const price = (name: string) => SERVICES.find((s) => s.name_en === name)!.price;
    expect(PRINT_RATES.photocopy).toBe(price("Photocopy"));
    expect(PRINT_RATES.blackAndWhite).toBe(price("Printout (Black & White)"));
    expect(PRINT_RATES.colour).toBe(price("Printout (Colour)"));
  });

  it("describes a Store with hours, map and a Tigri pin", () => {
    const data = storeJsonLd();
    expect(data["@type"]).toEqual(["Store", "LocalBusiness"]);
    expect(data.name).toBe(SHOP_NAME);
    expect(data.alternateName).toBe("Pencil Box");
    expect(data.telephone).toBe(PHONE_SCHEMA);
    expect(data.openingHoursSpecification[0]).toMatchObject({ opens: "07:00", closes: "21:30" });
    expect(data.openingHoursSpecification[0].dayOfWeek).toHaveLength(7);
    expect(data.hasMap).toBe(MAPS_URL);
    expect(data.sameAs).toEqual(SAME_AS);
    expect(data.sameAs).toContain("https://www.instagram.com/pencilbox.stationery");
    expect(data.sameAs.some((url) => url.includes("pencilbox.stationary") || url.includes("pencilboxstationery"))).toBe(false);
    expect(data.areaServed.map((a) => a.name)).toEqual([...AREAS_SERVED]);
    expect(data.address).toMatchObject({ streetAddress: "B-92, Block B, Tigri Extension", postalCode: "110062", addressCountry: "IN" });
    expect(data.geo).toMatchObject({ "@type": "GeoCoordinates", latitude: 28.5122, longitude: 77.2439 });
  });

  it("publishes the FAQ answers, including the live print rates", () => {
    const items = faqItems();
    expect(items.map((i) => i.q)).toEqual([
      "Photocopy/printout milta hai?",
      "Return gifts milte hain?",
      "Chart paper?",
      "Sunday ko khula hai?",
      "School/office bulk orders?",
      "Soft toys?",
      "Brands?",
      "Kahan hai?",
    ]);
    expect(items[0].a).toContain("₹2/page");
    expect(items[0].a).toContain("₹5");
    expect(items[0].a).toContain("₹10");
    expect(items[6].a).toContain("Nataraj");
    expect(items[6].a).toContain("Apsara");
  });

  it("maps the six poster categories to stable urls", () => {
    expect(COLLECTIONS.map((c) => c.slug)).toEqual(["notebooks", "pens", "art", "school", "gifts", "printing"]);
    expect(categoryMatchFromPath("/c/notebooks")).toBe("Notebooks & Registers");
    expect(categoryMatchFromPath("/c/nope")).toBeNull();
    expect(categoryMatchFromPath("/")).toBeNull();
  });
});
