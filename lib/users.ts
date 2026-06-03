import { sql } from "./db";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
};

export async function countUsers(): Promise<number> {
  const rows = (await sql`SELECT COUNT(*)::int AS n FROM users`) as { n: number }[];
  return rows[0]?.n ?? 0;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rows = (await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`) as UserRow[];
  return rows[0] ?? null;
}

export async function createUser(email: string, passwordHash: string): Promise<UserRow> {
  const rows = (await sql`
    INSERT INTO users (email, password_hash)
    VALUES (${email}, ${passwordHash})
    RETURNING *
  `) as UserRow[];
  return rows[0];
}
