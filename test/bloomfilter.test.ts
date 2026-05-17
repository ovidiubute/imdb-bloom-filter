import { describe, it, expect } from "vitest";
import { BloomFilter } from "../src/bloomfilter.js";

describe("BloomFilter", () => {
  it("should add and test elements", () => {
    const filter = new BloomFilter(1000, 5);
    filter.add("tt0000001");
    filter.add("tt0000002");

    expect(filter.test("tt0000001")).toBe(true);
    expect(filter.test("tt0000002")).toBe(true);
    expect(filter.test("tt0000003")).toBe(false);
  });

  it("should have zero false negatives", () => {
    const filter = new BloomFilter(10000, 7);
    const ids = ["tt0000001", "tt0000002", "tt0000003", "tt0000004", "tt0000005"];

    ids.forEach((id) => filter.add(id));
    ids.forEach((id) => {
      expect(filter.test(id)).toBe(true);
    });
  });

  it("should serialize and deserialize", () => {
    const filter = new BloomFilter(1000, 5);
    filter.add("tt0000001");
    filter.add("tt0000002");

    const json = JSON.stringify(filter);
    const restored = BloomFilter.fromJSON(json);

    expect(restored.test("tt0000001")).toBe(true);
    expect(restored.test("tt0000002")).toBe(true);
    expect(restored.test("tt0000003")).toBe(false);
    expect(restored.m).toBe(filter.m);
    expect(restored.k).toBe(filter.k);
  });

  it("should create filter with target error rate", () => {
    const filter = BloomFilter.withTargetError(1000000, 0.001);
    expect(filter.m).toBeGreaterThan(0);
    expect(filter.k).toBeGreaterThan(0);

    // Add 1M elements and check error rate is close to target
    for (let i = 0; i < 1000000; i++) {
      filter.add(`tt${String(i).padStart(7, "0")}`);
    }

    const error = filter.error();
    expect(error).toBeLessThan(0.002); // Should be close to 0.1%
  });

  it("should handle empty filter", () => {
    const filter = new BloomFilter(1000, 5);
    expect(filter.test("anything")).toBe(false);
  });

  it("should throw on invalid parameters", () => {
    expect(() => new BloomFilter(0, 5)).toThrow();
    expect(() => new BloomFilter(1000, 0)).toThrow();
    expect(() => new BloomFilter(-1, 5)).toThrow();
  });
});
