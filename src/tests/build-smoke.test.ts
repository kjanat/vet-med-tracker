import { describe, expect, it } from "bun:test";

describe("Build Smoke Tests", () => {
  it("can import trpc client", async () => {
    const module = await import("@/lib/trpc/client.tsx");
    expect(module.trpc).toBeDefined();
    expect(module.TRPCProvider).toBeDefined();
  });

  it("can import schemas", async () => {
    const animalSchema = await import("@/lib/schemas/animal.ts");
    const inventorySchema = await import("@/lib/schemas/inventory.ts");

    expect(animalSchema).toBeDefined();
    expect(inventorySchema).toBeDefined();
  });

  it("SSR pages have proper exports", async () => {
    // Verify that auth-error page exports correctly
    const authError = await import("@/app/auth-error/page.tsx");
    expect(authError.default).toBeDefined();
    expect(typeof authError.default).toBe("function");
  });
});
