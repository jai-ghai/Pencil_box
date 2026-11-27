import { describe, expect, it } from "vitest";
import { rupeesInWords } from "./money-words";

describe("rupeesInWords", () => {
  it("spells whole rupees and leftover paise", () => {
    expect(rupeesInWords(14000)).toBe("One hundred forty rupees only");
    expect(rupeesInWords(100)).toBe("One rupee only");
    expect(rupeesInWords(250)).toBe("Two rupees and fifty paise only");
    expect(rupeesInWords(0)).toBe("Zero rupees only");
    expect(rupeesInWords(125000)).toBe("One thousand two hundred fifty rupees only");
  });
});
