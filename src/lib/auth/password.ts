import { argon2id } from "@noble/hashes/argon2";
import { randomBytes } from "crypto";

/**
 * Password hashing with Argon2id (spec §29) using a PURE-JAVASCRIPT
 * implementation (@noble/hashes). This avoids the native `argon2` package,
 * whose prebuilt binary is platform-specific and fails on Vercel/Linux
 * ("No native build was found for platform=linux"). Same algorithm, portable.
 *
 * Stored format (self-describing, pipe-separated):
 *   argon2id|m|t|p|<saltB64>|<hashB64>
 */

const PARAMS = { m: 19456, t: 2, p: 1 }; // 19 MiB, 2 iters, 1 lane (OWASP-ish)
const KEY_LEN = 32;
const SALT_LEN = 16;

function b64(buf: Uint8Array): string {
  return Buffer.from(buf).toString("base64");
}
function fromB64(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, "base64"));
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = new Uint8Array(randomBytes(SALT_LEN));
  const hash = argon2id(plain, salt, { m: PARAMS.m, t: PARAMS.t, p: PARAMS.p, dkLen: KEY_LEN });
  return `argon2id|${PARAMS.m}|${PARAMS.t}|${PARAMS.p}|${b64(salt)}|${b64(hash)}`;
}

/** Constant-time comparison of two byte arrays. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(stored: string, plain: string): Promise<boolean> {
  try {
    const parts = stored.split("|");
    if (parts.length !== 6 || parts[0] !== "argon2id") return false;
    const m = Number(parts[1]);
    const t = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = fromB64(parts[4]);
    const expected = fromB64(parts[5]);
    const actual = argon2id(plain, salt, { m, t, p, dkLen: expected.length });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Strong password policy (spec §29): min 10 chars, with upper, lower, digit and
 * symbol. Returns an error message or null if valid.
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) return "Password must be at least 10 characters.";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain a digit.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain a symbol.";
  return null;
}
