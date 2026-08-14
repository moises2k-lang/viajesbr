import { Pool } from "pg";

const globalForDb = globalThis as unknown as { pool?: Pool };

function crearPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta la variable DATABASE_URL");
  }
  return new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : undefined,
  });
}

export function pool(): Pool {
  if (!globalForDb.pool) {
    globalForDb.pool = crearPool();
  }
  return globalForDb.pool;
}

export async function query<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool().query(text, params);
  return result.rows as T[];
}
