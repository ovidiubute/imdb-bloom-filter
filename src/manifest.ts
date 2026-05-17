export interface Manifest {
  sourceFile: string;
  itemCount: number;
  targetErrorRate: number;
  actualErrorRate: number;
  filterBits: number;
  hashFunctions: number;
  filterSizeBytes: number;
  buildTimestamp: string;
  filterFile: string;
  manifestFile: string;
}

export function generateManifest(
  sourceFile: string,
  itemCount: number,
  targetErrorRate: number,
  filter: { m: number; k: number; error(): number; buckets: Uint32Array },
  timestamp: string,
  filterFile: string,
  manifestFile: string
): Manifest {
  return {
    sourceFile,
    itemCount,
    targetErrorRate,
    actualErrorRate: filter.error(),
    filterBits: filter.m,
    hashFunctions: filter.k,
    filterSizeBytes: filter.buckets.length * 4,
    buildTimestamp: timestamp,
    filterFile,
    manifestFile,
  };
}
