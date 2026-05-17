# IMDB Bloom Filter

A Bloom filter CLI for validating IMDB title IDs (`tt0000001`, etc.).

Given a 1GB TSV file of IMDB data, this tool builds a compact Bloom filter that instantly tells you if an ID is **definitely invalid** or **probably valid**.

## Real-World Numbers

Tested on the actual IMDB `title.basics.tsv` (~1GB):

| Metric | Value |
|--------|-------|
| Input size | ~1GB (12M titles) |
| Filter size | **~60MB** |
| Build time | ~2 minutes |
| Query time | ~0.1ms per ID |
| False positive rate | 0.1% (configurable) |
| False negatives | **Zero** |

At 0.1% error rate, you get ~5MB per 1M IDs.

## Quick Start

```bash
git clone https://github.com/ovidiubute/imdb-bloom-filter.git
cd imdb-bloom-filter
npm install
npm run build

# Build your filter
node dist/cli.js build --input title.basics.tsv

# Query an ID
node dist/cli.js query --id tt0000001
# → tt0000001: VALID (probably)
```

## Building the Filter

```bash
node dist/cli.js build --input path/to/title.basics.tsv --output-dir ./output
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `-i, --input` | Path to IMDB TSV file | **required** |
| `-o, --output-dir` | Where to save the filter | `./output` |
| `-e, --error-rate` | Target false positive rate | `0.001` (0.1%) |

**Example:**
```bash
node dist/cli.js build --input ~/Downloads/title.basics.tsv --output-dir ./filters
```

**Output files:**
- `bloom-filter-20260517T1300Z.json` — The serialized filter
- `manifest-20260517T1300Z.json` — Metadata (count, error rate, timestamp)

The build runs in two passes with progress bars:
1. **Count pass** — Streams file to count total IDs
2. **Populate pass** — Builds the filter with ETA

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

Invalid ID:
```
tt9999999: INVALID (definitely)
```

### Batch Query

Create `ids.txt`:
```
tt0000001
tt0000002
fake123
```

Run:
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

Query automatically finds the latest filter in `./output`. No filter? It'll tell you to run `build` first.

## How It Works

A Bloom filter is a probabilistic data structure:
- **Zero false negatives** — Real IDs are never rejected
- **Configurable false positives** — Fake IDs that slip through (default: 0.1%)
- **Memory efficient** — ~5MB per 1M IDs at 0.1% FPR

## Daily Rebuilds

Designed for daily rebuilds. Each build creates timestamped files:

```bash
# Rebuild daily at 3 AM
crontab -e
# Add: 0 3 * * * cd /path/to/imdb-bloom-filter && node dist/cli.js build --input /data/title.basics.tsv
```

**What you get:**
- Versioned filters (keep multiple)
- Easy S3 upload for distribution
- Simple rollback if needed

## Testing

```bash
npm test
```

Tests cover:
- Bloom filter correctness (add/test/serialize)
- Zero false negatives guarantee
- Query functionality (single, batch, auto-discovery)
- Manifest generation

## License

The Bloom filter implementation is adapted from [jasondavies/bloomfilter.js](https://github.com/jasondavies/bloomfilter.js) (BSD-3-Clause).
