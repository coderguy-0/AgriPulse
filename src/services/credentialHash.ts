/**
 * Credential hashing for standalone (API-less) sessions only.
 *
 * In hosted mode the Express API hashes passwords with scrypt server-side and the browser never
 * receives a hash. In standalone mode there is no server, so the browser has to keep something.
 * We store a salted PBKDF2-SHA256 digest through WebCrypto rather than the password itself, purely
 * so a shared demo device does not hold plaintext credentials.
 *
 * This is NOT a security boundary: anyone with access to the browser profile can clear or replace
 * this data, and no real authentication is being claimed. The UI says so explicitly.
 */

const PBKDF2_ITERATIONS = 210_000;
const KEY_BITS = 256;

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string): Uint8Array =>
  new Uint8Array((hex.match(/.{1,2}/g) || []).map((pair) => Number.parseInt(pair, 16)));

const randomHex = (bytes: number): string => {
  const buffer = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(buffer);
    return Array.from(buffer).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return Array.from({ length: bytes * 2 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
};

const subtle = (): SubtleCrypto | null => {
  try {
    return typeof crypto !== 'undefined' && crypto.subtle ? crypto.subtle : null;
  } catch {
    return null;
  }
};

/** Deterministic non-cryptographic digest, used only when WebCrypto is unavailable (plain http). */
function fallbackDigest(value: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

async function derive(password: string, saltHex: string, iterations: number): Promise<string> {
  const webcrypto = subtle();
  if (!webcrypto) {
    return `weak$${iterations}$${saltHex}$${fallbackDigest(`${saltHex}:${password}:${iterations}`)}`;
  }
  const key = await webcrypto.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await webcrypto.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations, hash: 'SHA-256' },
    key,
    KEY_BITS,
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const saltHex = randomHex(16);
  const digest = await derive(password, saltHex, PBKDF2_ITERATIONS);
  return `${digest.startsWith('weak$') ? '' : 'pbkdf2$'}${PBKDF2_ITERATIONS}$${saltHex}$${digest.split('$').pop()}`;
}

export async function verifyPassword(password: string, encoded: string | null | undefined): Promise<boolean> {
  if (!encoded) return false;
  const [algorithm, iterationsRaw, saltHex, expectedHex] = encoded.split('$');
  if (!algorithm || !iterationsRaw || !saltHex || !expectedHex) return false;
  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  const derived = await derive(password, saltHex, iterations);
  const actual = derived.split('$').pop() || '';
  if (actual.length !== expectedHex.length) return false;
  // Constant-time-ish comparison; lengths already match.
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) {
    mismatch |= actual.charCodeAt(index) ^ expectedHex.charCodeAt(index);
  }
  return mismatch === 0;
}
