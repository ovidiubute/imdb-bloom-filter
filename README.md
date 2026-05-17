# IMDB Bloom Filter

A memory-efficient Bloom filter CLI tool for validating IMDB title IDs (`tt0000001`, etc.).

Given a 1GB TSV file of IMDB data, this tool builds a compact Bloom filter (~18MB for 10M IDs at 0.1% false positive rate) that can instantly tell you if an ID is **definitely invalid** or **probably valid**.

## Installation

```bash
git clone git@github-personal.com:ovidiubute/imdb-bloom-filter.git
cd imdb-bloom-filter
npm install
npm run build
```

## Building the Filter

```bash
node dist/cli.js build --input path/to/title.basics.tsv --output-dir ./output
```

**Options:**
- `--input, -i` — Path to IMDB TSV file (required)
- `--output-dir, -o` — Output directory (default: `./output`)
- `--error-rate, -e` — Target false positive rate (default: `0.001` = 0.1%)

**Example:**
```bash
node dist/cli.js build --input ~/Downloads/title.basics.tsv --output-dir ./filters
```

**Output files:**
- `bloom-filter-20260517T1300Z.json` — The serialized Bloom filter
- `manifest-20260517T1300Z.json` — Metadata including item count, error rate, and build timestamp

The build process uses two passes:
1. **Count pass** — Streams the file to count total IDs (shows byte progress)
2. **Populate pass** — Builds the filter (shows row progress with ETA)

## Querying

### Single ID

```bash
node dist/cli.js query --id tt0000001
```

**Output:**
```
Using filter: output/bloom-filter-20260517T1300Z.json

tt0000001: VALID (probably)
```

Or for an invalid ID:
```
tt9999999: INVALID (definitely)
```

### Batch Query

Create a file with one ID per line:
```
# ids.txt
tt0000001
tt0000002
fake123
```

Then run:
```bash
node dist/cli.js query --batch ids.txt
```

**Output:**
```
Using filter: output/bloom-filter-20260517T1300Z.json

tt0000001: VALID (probably)
tt0000002: VALID (probably)
fake123: INVALID (definitely)

--- Summary ---
Total checked: 3
Valid: 2
Invalid: 1
```

### Auto-discovery

If you don't specify `--output-dir`, the query command automatically finds the latest filter in `./output`.

If no filter exists, it prompts you to run `build` first.

## How It Works

A Bloom filter is a probabilistic data structure that:
- Uses minimal memory (~1.8 bytes per item at 0.1% FPR)
- Has **zero false negatives** (genuine IDs are never rejected)
- Has a configurable false positive rate (invalid IDs that pass through)

For 10 million IMDB IDs:
| False Positive Rate | Filter Size | Hash Functions |
|-------------------|-------------|----------------|
| 1% | ~12 MB | 7 |
| 0.1% | ~18 MB | 10 |
| 0.01% | ~24 MB | 14 |

## Daily Rebuilds

The tool is designed for daily rebuilds. Each build creates timestamped files, so you can:
- Keep multiple versions
- Upload to S3 for distribution
- Roll back if needed

Example cron job:
```bash
# Rebuild daily at 3 AM
0 3 * * * cd /path/to/imdb-bloom-filter && node dist/cli.js build --input /data/title.basics.tsv
```

## License

The Bloom filter implementation is adapted from [jasondavies/bloomfilter.js](https://github.com/jasondavies/bloomfilter.js) (BSD-3-Clause).
