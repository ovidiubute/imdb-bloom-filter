// Bloom Filter implementation adapted from jasondavies/bloomfilter.js
// https://github.com/jasondavies/bloomfilter.js
// BSD-3-Clause License

const MAX_BITS = 0x100000000;
const MAX_BUCKETS = MAX_BITS / 32;
const SERIALISATION_VERSION = 1;

export class BloomFilter {
  m: number;
  k: number;
  buckets: Uint32Array;
  private _locations: Uint8Array | Uint16Array | Uint32Array;

  constructor(m: number | ArrayLike<number>, k: number) {
    let a: ArrayLike<number> | undefined;
    if (typeof m !== "number") {
      assertBucketArrayLike(m);
      a = m;
      m = a.length * 32;
    } else {
      assertBitSize(m);
    }
    assertHashCount(k);

    const n = Math.ceil(m / 32);
    m = n * 32;
    this.m = m;
    this.k = k;

    const kbytes = 1 << Math.ceil(Math.log2(Math.ceil(Math.log2(m) / 8)));
    const ArrayType = kbytes === 1 ? Uint8Array : kbytes === 2 ? Uint16Array : Uint32Array;
    const kbuffer = new ArrayBuffer(kbytes * k);
    const buckets = new Uint32Array(n);
    if (a) {
      for (let i = 0; i < n; ++i) {
        const value = a[i];
        assertBucketValue(value);
        buckets[i] = value;
      }
    }
    this.buckets = buckets;
    this._locations = new ArrayType(kbuffer);
  }

  locations(v: string): Uint8Array | Uint16Array | Uint32Array {
    const k = this.k;
    const m = this.m;
    const r = this._locations;
    let a: number;
    let b: number;

    {
      const fnv64PrimeX = 0x01b3;
      const l = v.length;
      let t0 = 0, t1 = 0, t2 = 0, t3 = 0;
      let v0 = 0x2325, v1 = 0x8422, v2 = 0x9ce4, v3 = 0xcbf2;

      for (let i = 0; i < l; ++i) {
        v0 ^= v.charCodeAt(i);
        t0 = v0 * fnv64PrimeX; t1 = v1 * fnv64PrimeX; t2 = v2 * fnv64PrimeX; t3 = v3 * fnv64PrimeX;
        t2 += v0 << 8; t3 += v1 << 8;
        t1 += t0 >>> 16;
        v0 = t0 & 0xffff;
        t2 += t1 >>> 16;
        v1 = t1 & 0xffff;
        v3 = (t3 + (t2 >>> 16)) & 0xffff;
        v2 = t2 & 0xffff;
      }

      a = (v3 << 16) | v2;
      b = (v1 << 16) | v0;
    }

    a = (a % m);
    if (a < 0) a += m;
    b = (b % m);
    if (b < 0) b += m;

    r[0] = a;
    for (let i = 1; i < k; ++i) {
      a = (a + b) % m;
      b = (b + i) % m;
      r[i] = a;
    }
    return r;
  }

  add(v: string) {
    const l = this.locations(v + "");
    const k = this.k;
    const buckets = this.buckets;
    for (let i = 0; i < k; ++i) {
      buckets[l[i] >>> 5] |= 1 << (l[i] & 0x1f);
    }
  }

  test(v: string): boolean {
    const l = this.locations(v + "");
    const k = this.k;
    const buckets = this.buckets;
    for (let i = 0; i < k; ++i) {
      const b = l[i];
      if ((buckets[b >>> 5] & (1 << (b & 0x1f))) === 0) {
        return false;
      }
    }
    return true;
  }

  size(): number {
    return -this.m * Math.log(1 - this.countBits() / this.m) / this.k;
  }

  countBits(): number {
    const buckets = this.buckets;
    let bits = 0;
    for (let i = 0; i < buckets.length; ++i) {
      bits += popcnt(buckets[i]);
    }
    return bits;
  }

  error(): number {
    return Math.pow(this.countBits() / this.m, this.k);
  }

  toJSON() {
    return {
      version: SERIALISATION_VERSION,
      m: this.m,
      k: this.k,
      buckets: Array.from(this.buckets)
    };
  }

  static fromJSON(value: string | object): BloomFilter {
    const data = typeof value === "string" ? JSON.parse(value) : value;
    assertSerialisedFilter(data);

    if (data.version !== undefined && data.version !== SERIALISATION_VERSION) {
      throw new RangeError(`Unsupported BloomFilter serialisation format version: ${data.version}.`);
    }

    const expectedM = data.buckets.length * 32;
    if (data.m !== undefined && data.m !== expectedM) {
      throw new RangeError("Serialised BloomFilter has inconsistent m and buckets.");
    }

    return new BloomFilter(data.buckets, data.k);
  }

  static withTargetError(n: number, error: number): BloomFilter {
    assertExpectedSize(n);
    assertTargetError(error);
    const m = Math.ceil(-n * Math.log2(error) / Math.LN2);
    const k = Math.ceil(Math.LN2 * m / n);
    return new BloomFilter(m, k);
  }
}

function popcnt(v: number): number {
  v -= (v >>> 1) & 0x55555555;
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return ((v + (v >>> 4) & 0xf0f0f0f) * 0x1010101) >>> 24;
}

function assertBitSize(m: number) {
  if (typeof m !== "number" || !Number.isFinite(m) || m <= 0 || m > MAX_BITS) {
    throw new RangeError(`m must be a positive finite number of bits no greater than ${MAX_BITS}.`);
  }
}

function assertBucketArrayLike(a: ArrayLike<number>) {
  if (a == null || !Number.isInteger(a.length) || a.length <= 0 || a.length > MAX_BUCKETS) {
    throw new RangeError(`m must be a positive number of bits or a non-empty array-like of up to ${MAX_BUCKETS} 32-bit buckets.`);
  }
}

function assertBucketValue(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError("Bucket values must be unsigned 32-bit integers.");
  }
}

function assertHashCount(k: number) {
  if (!Number.isInteger(k) || k <= 0) {
    throw new RangeError("k must be a positive integer.");
  }
}

function assertExpectedSize(n: number) {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) {
    throw new RangeError("n must be a positive finite number.");
  }
}

function assertTargetError(error: number) {
  if (typeof error !== "number" || !Number.isFinite(error) || error <= 0 || error >= 1) {
    throw new RangeError("error must be a finite number between 0 and 1, exclusive.");
  }
}

function assertSerialisedFilter(data: Record<string, unknown>) {
  if (data == null || typeof data !== "object") {
    throw new RangeError("Serialised BloomFilter must be an object or JSON string.");
  }
  if (!("k" in data)) {
    throw new RangeError("Serialised BloomFilter must include k.");
  }
  if (!("buckets" in data)) {
    throw new RangeError("Serialised BloomFilter must include buckets.");
  }
}
