import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { BloomFilter } from "./bloomfilter.js";

export async function findLatestFilter(outputDir: string): Promise<string | null> {
  try {
    const files = await readdir(outputDir);
    const filterFiles = files
      .filter((f) => f.startsWith("bloom-filter-") && f.endsWith(".json"))
      .sort()
      .reverse();

    if (filterFiles.length === 0) return null;
    return join(outputDir, filterFiles[0]);
  } catch {
    return null;
  }
}

export async function loadFilter(filterPath: string): Promise<BloomFilter> {
  const data = await readFile(filterPath, "utf-8");
  return BloomFilter.fromJSON(data);
}

export function checkId(filter: BloomFilter, id: string): boolean {
  return filter.test(id);
}

export interface BatchResult {
  id: string;
  valid: boolean;
}

export async function queryBatch(filter: BloomFilter, filePath: string): Promise<BatchResult[]> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());
  return lines.map((id) => ({
    id: id.trim(),
    valid: checkId(filter, id.trim()),
  }));
}
