import { describe, expect, it } from "vitest";
import { REGISTER_RUPEES, isRegisterTitle, registerCategoryId } from "./register-covers";

describe("register covers", () => {
  it("lists every price from 20 to 110 in steps of 10", () => {
    expect(REGISTER_RUPEES).toEqual([20, 30, 40, 50, 60, 70, 80, 90, 100, 110]);
  });

  it("recognises a register title and leaves notebooks alone", () => {
    expect(isRegisterTitle("Register")).toBe(true);
    expect(isRegisterTitle("Register ₹20")).toBe(true);
    expect(isRegisterTitle("Delta A4 Register ₹40")).toBe(true);
    expect(isRegisterTitle("Notebook")).toBe(false);
    expect(isRegisterTitle("Spiral Notebook ₹60")).toBe(false);
  });

  it("picks the Registers shelf under notebooks", () => {
    const id = registerCategoryId([
      { _id: "parent", name_en: "Notebooks & Registers" },
      { _id: "books", name_en: "Notebooks", parentId: "parent" },
      { _id: "regs", name_en: "Registers", parentId: "parent" },
      { _id: "other", name_en: "Registers" },
    ]);
    expect(id).toBe("regs");
  });
});
