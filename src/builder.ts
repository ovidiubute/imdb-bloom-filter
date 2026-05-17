import { createReadStream } from "fs";
import { createInterface } from "readline";
import { stat } from "fs/promises";
import { BloomFilter } from "./bloomfilter.js";
import cliProgress from "cli-progress";

export async function countLines(filePath: string): Promise<number> {
  const stats = await stat(filePath);
  const fileSize = stats.size;

  const progressBar = new cliProgress.SingleBar({
    format: "Pass 1 (count)     |{bar}| {percentage}% | {value}/{total} bytes | ETA: {eta}s",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
  });
  progressBar.start(fileSize, 0);

  const stream = createReadStream(filePath);
  const rl = createInterface({ input: stream });

  let count = 0;
  let bytesRead = 0;
  let isFirstLine = true;

  stream.on("data", (chunk) => {
    bytesRead += Buffer.byteLength(chunk);
    progressBar.update(bytesRead);
  });

  for await (const line of rl) {
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }
    if (line.trim()) {
      count++;
    }
  }

  progressBar.stop();
  return count;
}

export async function buildFilter(
  filePath: string,
  itemCount: number,
  errorRate: number
): Promise<BloomFilter> {
  const filter = BloomFilter.withTargetError(itemCount, errorRate);

  const progressBar = new cliProgress.SingleBar({
    format: "Pass 2 (populate)  |{bar}| {percentage}% | {value}/{total} rows | ETA: {eta}s",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
  });
  progressBar.start(itemCount, 0);

  const stream = createReadStream(filePath);
  const rl = createInterface({ input: stream });

  let processed = 0;
  let isFirstLine = true;

  for await (const line of rl) {
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }
    if (!line.trim()) continue;

    const tconst = line.split("\t")[0];
    if (tconst) {
      filter.add(tconst);
    }

    processed++;
    progressBar.update(processed);
  }

  progressBar.stop();
  return filter;
}
