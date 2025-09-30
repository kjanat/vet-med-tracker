import { describe, expect, it } from "bun:test";
import React from "react";

describe("AppProvider", () => {
  it("exports ConsolidatedAppProvider", async () => {
    const module = await import(
      "@/components/providers/app-provider-consolidated"
    );
    expect(module.ConsolidatedAppProvider).toBeDefined();
    expect(typeof module.ConsolidatedAppProvider).toBe("function");
  });

  it("exports useApp hook", async () => {
    const module = await import(
      "@/components/providers/app-provider-consolidated"
    );
    expect(module.useApp).toBeDefined();
    expect(typeof module.useApp).toBe("function");
  });
});
