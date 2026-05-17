#!/usr/bin/env node
import { Command } from "commander";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { BloomFilter } from "./bloomfilter.js";
import { countLines, buildFilter } from "./builder.js";
import { findLatestFilter, loadFilter, checkId, queryBatch } from "./query.js";
import { generateManifest } from "./manifest.js";

const program = new Command();
const DEFAULT_OUTPUT_DIR = "./output";
const DEFAULT_ERROR_RATE = 0.001;

function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "").slice(0, 15) + "Z";
}

program
  .name("imdb-bloom-filter")
  .description("Build and query a Bloom filter for IMDB IDs")
  .version("1.0.0");

program
  .command("build")
  .description("Build a Bloom filter from an IMDB TSV file")
  .requiredOption("-i, --input <path>", "Path to the IMDB TSV file")
  .option("-o, --output-dir <path>", "Output directory for filter and manifest", DEFAULT_OUTPUT_DIR)
  .option("-e, --error-rate <number>", "Target false positive rate", String(DEFAULT_ERROR_RATE))
  .action(async (options) => {
    const inputPath = options.input;
    const outputDir = options.outputDir;
    const errorRate = parseFloat(options.errorRate);

    if (!existsSync(inputPath)) {
      console.error(`Error: Input file not found: ${inputPath}`);
      process.exit(1);
    }

    await mkdir(outputDir, { recursive: true });

    console.log(`Building Bloom filter from: ${inputPath}`);
    console.log(`Target error rate: ${errorRate * 100}%`);
    console.log();

    const itemCount = await countLines(inputPath);
    console.log(`Found ${itemCount.toLocaleString()} items\n`);

    const filter = await buildFilter(inputPath, itemCount, errorRate);

    const timestamp = getTimestamp();
    const filterFile = `bloom-filter-${timestamp}.json`;
    const manifestFile = `manifest-${timestamp}.json`;
    const filterPath = join(outputDir, filterFile);
    const manifestPath = join(outputDir, manifestFile);

    await writeFile(filterPath, JSON.stringify(filter));
    console.log(`\nFilter saved to: ${filterPath}`);

    const manifest = generateManifest(
      inputPath,
      itemCount,
      errorRate,
      filter,
      timestamp,
      filterFile,
      manifestFile
    );
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Manifest saved to: ${manifestPath}`);
  });

program
  .command("query")
  .description("Query if an IMDB ID is valid")
  .option("-i, --id <id>", "Single IMDB ID to check (e.g., tt0000001)")
  .option("-b, --batch <path>", "Path to file with IDs to check (one per line)")
  .option("-o, --output-dir <path>", "Directory containing bloom filters", DEFAULT_OUTPUT_DIR)
  .action(async (options) => {
    if (!options.id && !options.batch) {
      console.error("Error: Provide either --id or --batch option");
      process.exit(1);
    }

    const filterPath = await findLatestFilter(options.outputDir);
    if (!filterPath) {
      console.error(`Error: No bloom filter found in ${options.outputDir}`);
      console.error("Run 'build' first:");
      console.error(`  node dist/cli.js build --input <path-to-tsv>`);
      process.exit(1);
    }

    console.log(`Using filter: ${filterPath}\n`);
    const filter = await loadFilter(filterPath);

    if (options.id) {
      const valid = checkId(filter, options.id);
      console.log(`${options.id}: ${valid ? "VALID (probably)" : "INVALID (definitely)"}`);
    }

    if (options.batch) {
      const results = await queryBatch(filter, options.batch);
      for (const result of results) {
        console.log(`${result.id}: ${result.valid ? "VALID (probably)" : "INVALID (definitely)"}`);
      }
      console.log(`\n--- Summary ---`);
      console.log(`Total checked: ${results.length}`);
      console.log(`Valid: ${results.filter((r) => r.valid).length}`);
      console.log(`Invalid: ${results.filter((r) => !r.valid).length}`);
    }
  });

program.parse();
