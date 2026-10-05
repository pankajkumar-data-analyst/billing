import argon2 from "argon2";

/**
 * Password hashing with Argon2id (spec §29). Argon2id is memory-hard and the
 * current OWASP-recommended default for password storage.
 */

const OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
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
