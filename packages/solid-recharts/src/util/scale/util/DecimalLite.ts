// Replaces the decimal.js-light dependency for the tick-arithmetic pipeline
// (arithmetic.ts + getNiceTickValues.ts). Exact decimal arithmetic on a BigInt
// mantissa + base-10 exponent, covering precisely the API surface those two
// files use: construct from number/Decimal, add/sub/mul/div/mod/pow/abs,
// lt/isint/toNumber, and log(10).
//
// Parity notes vs decimal.js-light (the byte-exact tick spec matrix guards this):
//  - add/sub/mul/mod are EXACT here. decimal.js-light rounds results to its
//    20-significant-digit precision, but every operand in this pipeline comes
//    from a double (≤17 significant digits) and the chains stay well under 20
//    digits before `toNumber()`, so the results are identical.
//  - div rounds to 20 significant digits, ROUND_HALF_UP — decimal.js-light's
//    defaults — when the quotient does not terminate.
//  - log(10) is only ever consumed as `Math.floor(…toNumber()) + 1` (digit
//    count), so it returns the EXACT integer `floor(log10(|x|))` computed from
//    the decimal representation. Any return value with the same floor is
//    behavior-identical, and the exact floor avoids transcendental rounding.

const PRECISION = 20;

const parseRe = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i;

export default class Decimal {
  /** Normalized mantissa (no trailing zero digits; carries the sign). */
  private readonly m: bigint;
  /** Base-10 exponent: value = m * 10^e. Zero is (0n, 0). */
  private readonly e: number;

  constructor(value: number | string | Decimal) {
    if (value instanceof Decimal) {
      this.m = value.m;
      this.e = value.e;
      return;
    }
    const str = typeof value === "number" ? String(value) : value;
    const match = parseRe.exec(str);
    if (match == null) {
      throw new Error(`[DecimalLite] Invalid argument: ${str}`);
    }
    const [, sign, intPart, fracPart = "", expPart] = match;
    const digits = `${intPart ?? ""}${fracPart}`;
    let m = BigInt(digits);
    let e = (expPart ? Number(expPart) : 0) - fracPart.length;
    while (m !== 0n && m % 10n === 0n) {
      m /= 10n;
      e += 1;
    }
    if (m === 0n) {
      e = 0;
    }
    this.m = sign === "-" ? -m : m;
    this.e = e;
  }

  private static of(m: bigint, e: number): Decimal {
    let nm = m;
    let ne = e;
    while (nm !== 0n && nm % 10n === 0n) {
      nm /= 10n;
      ne += 1;
    }
    const d = new Decimal(0);
    // Reconstruct through the string form to keep the constructor the single
    // normalization point (cheap: numbers here are small).
    return nm === 0n ? d : new Decimal(`${nm}e${ne}`);
  }

  /** Both operands scaled to the smaller exponent: [am, bm, exp]. */
  private static aligned(a: Decimal, b: Decimal): [bigint, bigint, number] {
    const e = Math.min(a.e, b.e);
    return [a.m * 10n ** BigInt(a.e - e), b.m * 10n ** BigInt(b.e - e), e];
  }

  add(other: number | Decimal): Decimal {
    const o = other instanceof Decimal ? other : new Decimal(other);
    const [am, bm, e] = Decimal.aligned(this, o);
    return Decimal.of(am + bm, e);
  }

  sub(other: number | Decimal): Decimal {
    const o = other instanceof Decimal ? other : new Decimal(other);
    const [am, bm, e] = Decimal.aligned(this, o);
    return Decimal.of(am - bm, e);
  }

  mul(other: number | Decimal): Decimal {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return Decimal.of(this.m * o.m, this.e + o.e);
  }

  div(other: number | Decimal): Decimal {
    const o = other instanceof Decimal ? other : new Decimal(other);
    if (o.m === 0n) {
      throw new Error("[DecimalLite] Division by zero");
    }
    if (this.m === 0n) {
      return new Decimal(0);
    }
    // Compute PRECISION+1 quotient digits, then round half-up to PRECISION.
    const digitsA = (this.m < 0n ? -this.m : this.m).toString().length;
    const digitsB = (o.m < 0n ? -o.m : o.m).toString().length;
    const shift = PRECISION + 1 + Math.max(0, digitsB - digitsA);
    const num = this.m * 10n ** BigInt(shift);
    let q = num / o.m;
    const r = num % o.m;
    if (r === 0n) {
      return Decimal.of(q, this.e - o.e - shift);
    }
    // Non-terminating: keep exactly PRECISION significant digits, half-up.
    const negative = q < 0n;
    let qa = negative ? -q : q;
    let e = this.e - o.e - shift;
    const extra = qa.toString().length - PRECISION;
    if (extra > 0) {
      const scale = 10n ** BigInt(extra);
      const rem = qa % scale;
      qa /= scale;
      e += extra;
      if (rem * 2n >= scale) {
        qa += 1n;
      }
    }
    return Decimal.of(negative ? -qa : qa, e);
  }

  /** Truncated-division remainder (sign follows the dividend), exact. */
  mod(other: number | Decimal): Decimal {
    const o = other instanceof Decimal ? other : new Decimal(other);
    if (o.m === 0n) {
      throw new Error("[DecimalLite] Modulo by zero");
    }
    const [am, bm, e] = Decimal.aligned(this, o);
    return Decimal.of(am % bm, e);
  }

  /** Integer exponents only (the tick pipeline raises 10 to digit counts). */
  pow(n: number): Decimal {
    if (!Number.isInteger(n)) {
      throw new Error("[DecimalLite] pow supports integer exponents only");
    }
    if (n === 0) {
      return new Decimal(1);
    }
    const positive = Math.abs(n);
    let result = new Decimal(1);
    for (let i = 0; i < positive; i++) {
      result = result.mul(this);
    }
    return n > 0 ? result : new Decimal(1).div(result);
  }

  abs(): Decimal {
    return this.m < 0n ? Decimal.of(-this.m, this.e) : this;
  }

  /**
   * Base-10 logarithm, exact at floor precision: returns the integer
   * `floor(log10(|x|))` (see file header — that floor is all consumers use).
   */
  log(base: number): Decimal {
    if (base !== 10) {
      throw new Error("[DecimalLite] log supports base 10 only");
    }
    if (this.m === 0n) {
      throw new Error("[DecimalLite] log of zero");
    }
    const digits = (this.m < 0n ? -this.m : this.m).toString().length;
    return new Decimal(digits - 1 + this.e);
  }

  lt(other: number | Decimal): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    const [am, bm] = Decimal.aligned(this, o);
    return am < bm;
  }

  lte(other: number | Decimal): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    const [am, bm] = Decimal.aligned(this, o);
    return am <= bm;
  }

  isint(): boolean {
    return this.e >= 0;
  }

  toNumber(): number {
    return Number(`${this.m}e${this.e}`);
  }

  toString(): string {
    return String(this.toNumber());
  }
}
