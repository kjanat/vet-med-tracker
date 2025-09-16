import { describe, expect, test } from "bun:test";
import { adminKey } from "../utils/idempotency";

describe("adminKey", () => {
  const animalId = "animal-123";
  const regimenId = "regimen-456";
  const day = "2024-03-18";

  test("creates deterministic keys when slot is provided", () => {
    const key = adminKey(animalId, regimenId, day, 2);
    expect(key).toBe("animal-123:regimen-456:2024-03-18:2");
  });

  test("embeds PRN namespace and randomness when no slot supplied", () => {
    const first = adminKey(animalId, regimenId, day);
    const second = adminKey(animalId, regimenId, day);

    expect(first).toMatch(
      /^animal-123:regimen-456:2024-03-18:prn:[0-9a-f-]{36}$/,
    );
    expect(second).toMatch(
      /^animal-123:regimen-456:2024-03-18:prn:[0-9a-f-]{36}$/,
    );
    expect(first).not.toBe(second);
  });
});
