import { describe, expect, it } from "vitest";
import { ALL_PERMS, cleanPerms, DEFAULT_ADMIN_PERMS, effectivePerms, normalizeRole } from "./permissions";
import { validOrigin, validQrTarget } from "./settings";

describe("roles and permissions", () => {
  it("treats the old 'owner' login as the super admin and rejects unknown roles", () => {
    expect(normalizeRole("owner")).toBe("superadmin");
    expect(normalizeRole("admin")).toBe("admin");
    expect(normalizeRole("cashier")).toBe("cashier");
    expect(normalizeRole("root")).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
  });
  it("gives the super admin everything, an admin only what was ticked, and a cashier nothing", () => {
    expect(effectivePerms("superadmin", [])).toEqual(ALL_PERMS);
    expect(effectivePerms("admin", ["orders", "reports"])).toEqual(["orders", "reports"]);
    expect(effectivePerms("admin", [])).toEqual([]);
    expect(effectivePerms("cashier", ALL_PERMS)).toEqual([]);
  });
  it("ignores permission names that do not exist", () => {
    expect(effectivePerms("admin", ["orders", "make-me-owner"])).toEqual(["orders"]);
    expect(cleanPerms(["orders", "orders", "nope"])).toEqual(["orders"]);
  });
  it("a new admin gets every page but none of the delete or edit actions", () => {
    expect(DEFAULT_ADMIN_PERMS).toContain("reports");
    expect(DEFAULT_ADMIN_PERMS).not.toContain("orders:delete");
    expect(DEFAULT_ADMIN_PERMS).not.toContain("orders:edit");
    expect(DEFAULT_ADMIN_PERMS).not.toContain("products:delete");
  });
});

describe("QR destination (an open redirect would be a security bug)", () => {
  it("accepts a page on this site or an https link", () => {
    expect(validQrTarget("/")).toBe("/");
    expect(validQrTarget(" /?cat=pens ")).toBe("/?cat=pens");
    expect(validQrTarget("https://wa.me/919999999999")).toBe("https://wa.me/919999999999");
  });
  it("refuses protocol-relative, script, plain-http and malformed targets", () => {
    for (const bad of ["//evil.example", "javascript:alert(1)", "http://example.com", "data:text/html,hi", "", "   ", "/has space", "not a url", 42, null]) {
      expect(validQrTarget(bad)).toBeNull();
    }
  });
  it("accepts a website address only as https (or localhost for testing) and strips any path", () => {
    expect(validOrigin("https://pencilbox.store/")).toBe("https://pencilbox.store");
    expect(validOrigin("https://pencilbox.store/q?x=1")).toBe("https://pencilbox.store");
    expect(validOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(validOrigin("http://pencilbox.store")).toBeNull();
    expect(validOrigin("javascript:1")).toBeNull();
    expect(validOrigin("pencilbox.store")).toBeNull();
  });
});
