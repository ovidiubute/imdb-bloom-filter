import { describe, it, expect } from "vitest";
import { generateManifest } from "../src/manifest.js";
import { BloomFilter } from "../src/bloomfilter.js";

describe("Manifest", () => {
  it("should generate correct manifest", () => {
    const filter = new BloomFilter(10000, 7);
    filter.add("tt0000001");

    const manifest = generateManifest(
      "title.basics.tsv",
      1000000,
      0.001,
      filter,
      "2026-05-17T1300Z",
      "bloom-filter-2026-05-17T1300Z.json",
      "manifest-2026-05-17T1300Z.json"
    );

    expect(manifest.sourceFile).toBe("title.basics.tsv");
    expect(manifest.itemCount).toBe(1000000);
    expect(manifest.targetErrorRate).toBe(0.001);
    expect(manifest.filterBits).toBe(filter.m);
    expect(manifest.hashFunctions).toBe(filter.k);
    expect(manifest.buildTimestamp).toBe("2026-05-17T1300Z");
    expect(manifest.filterFile).toBe("bloom-filter-2026-05-17T1300Z.json");
    expect(manifest.manifestFile).toBe("manifest-2026-05-17T1300Z.json");
    expect(manifest.filterSizeBytes).toBe(filter.buckets.length * 4);
    expect(typeof manifest.actualErrorRate).toBe("number");
  });
});
