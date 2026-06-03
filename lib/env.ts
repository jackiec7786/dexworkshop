// Centralized, lazily-validated environment access.
// Getters throw only when *read* at request time — never at import/build time —
// so `next build` and CI work without secrets present.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local (see .env.local.example) or your hosting provider.`
    );
  }
  return value;
}

export const env = {
  get databaseUrl(): string {
    return required("DATABASE_URL");
  },
  get blobToken(): string {
    return required("BLOB_READ_WRITE_TOKEN");
  },
  get authSecret(): string {
    const secret = required("AUTH_SECRET");
    if (secret.length < 32) {
      throw new Error("AUTH_SECRET must be at least 32 characters long.");
    }
    return secret;
  },
};
