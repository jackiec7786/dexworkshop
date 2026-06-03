import bcrypt from "bcryptjs";

// Node-runtime only (routes that import this pin `runtime = "nodejs"`).
const ROUNDS = 12;

// A valid-format hash used to keep login timing constant when the account
// doesn't exist (mitigates user enumeration via response timing).
export const DUMMY_HASH = "$2a$12$ySigtgJuVO1xtPPyYJEHFeE4mBMSfF0PlCJ4.RGv9cjJY/PCDERfa";

export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plaintext, hash);
  } catch {
    return false;
  }
}
