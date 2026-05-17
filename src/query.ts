import { readdir, readFile, access } from "fs/promises";
import { join } from "path";
import { BloomFilter } from "./bloomfilter.js";

export class BloomFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BloomFilterError";
  }
}

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
  try {
    const data = await readFile(filterPath, "utf-8");
    return BloomFilter.fromJSON(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new BloomFilterError(`Filter file not found: ${filterPath}`);
    }
    throw new BloomFilterError(`Failed to load filter: ${(error as Error).message}`);
  }
}

export function checkId(filter: BloomFilter, id: string): boolean {
  return filter.test(id);
}

export interface BatchResult {
  id: string;
  valid: boolean;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function queryBatch(filter: BloomFilter, filePath: string): Promise<BatchResult[]> {
  if (!(await fileExists(filePath))) {
    throw new BloomFilterError(`Batch file not found: ${filePath}`);
  }

  try {
    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());
    
    if (lines.length === 0) {
      throw new BloomFilterError(`Batch file is empty: ${filePath}`);
    }
    
    return lines.map((id) => ({
      id: id.trim(),
      valid: checkId(filter, id.trim()),
    }));
  } catch (error) {
    if (error instanceof BloomFilterError) throw error;
    throw new BloomFilterError(`Failed to read batch file: ${(error as Error).message}`);
  }
}
