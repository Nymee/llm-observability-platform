import { Pool } from "pg";

// Module-level singleton — one pool shared across all API route invocations.
// Next.js can run multiple instances, so we guard with a global to survive
// hot-reloads in development without exhausting Postgres connections.
declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

export const db: Pool = globalThis._pgPool ?? (globalThis._pgPool = createPool());
