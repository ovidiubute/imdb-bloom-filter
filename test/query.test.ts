import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { BloomFilter } from "../src/bloomfilter.js";
import { findLatestFilter, loadFilter, checkId, queryBatch } from "../src/query.js";

const TEST_DIR = "./test-output";

describe("Query", () => {
  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    const filter = new BloomFilter(1000, 5);
    filter.add("tt0000001");
    filter.add("tt0000002");
    await writeFile(join(TEST_DIR, "bloom-filter-20260517T1300Z.json"), JSON.stringify(filter));
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("should find latest filter", async () => {
    const path = await findLatestFilter(TEST_DIR);
    expect(path).toContain("bloom-filter-20260517T1300Z.json");
  });

  it("should return null when no filter exists", async () => {
    const path = await findLatestFilter("./nonexistent");
    expect(path).toBeNull();
  });

  it("should load filter from file", async () => {
    const filter = await loadFilter(join(TEST_DIR, "bloom-filter-20260517T1300Z.json"));
    expect(filter.test("tt0000001")).toBe(true);
    expect(filter.test("tt0000002")).toBe(true);
    expect(filter.test("tt0000003")).toBe(false);
  });

  it("should check single ID", () => {
    const filter = new BloomFilter(1000, 5);
    filter.add("tt0000001");

    expect(checkId(filter, "tt0000001")).toBe(true);
    expect(checkId(filter, "fake123")).toBe(false);
  });

  it("should query batch from file", async () => {
    const idsFile = join(TEST_DIR, "ids.txt");
    await writeFile(idsFile, "tt0000001\ntt0000002\nfake123\n");

    const filter = new BloomFilter(1000, 5);
    filter.add("tt0000001");
    filter.add("tt0000002");

    const results = await queryBatch(filter, idsFile);
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ id: "tt0000001", valid: true });
    expect(results[1]).toEqual({ id: "tt0000002", valid: true });
    expect(results[2]).toEqual({ id: "fake123", valid: false });
  });
});
