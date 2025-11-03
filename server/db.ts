
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

// For development, we'll use a local in-memory database simulation
// In production, this would connect to a real Neon database
const connectionString = process.env.DATABASE_URL || '';

let sql: ReturnType<typeof neon>;
let db: ReturnType<typeof drizzle>;

if (connectionString) {
  sql = neon(connectionString);
  db = drizzle(sql);
} else {
  // Fallback for development without a database
  // This creates a minimal mock that allows the app to run
  const mockSql = (() => {
    const mock: any = async () => ({ rows: [] });
    mock.transaction = async (cb: any) => cb(mock);
    return mock;
  })();
  
  sql = mockSql as any;
  db = drizzle(mockSql as any);
}

export { db, sql };
