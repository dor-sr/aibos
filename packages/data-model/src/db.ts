import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// For use in server-side code
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL not set. Add your Postgres connection string to .env.local');
}

const isPlaceholderValue =
  connectionString.includes('user:password@host:5432/database') ||
  connectionString.includes('YOUR_DB_PASSWORD');

if (isPlaceholderValue) {
  throw new Error(
    'DATABASE_URL is still using the placeholder value. Replace it with your real Postgres connection string.'
  );
}

// Connection for queries
const queryClient = postgres(connectionString ?? '', {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: 'require',
});

// Drizzle instance with schema
export const db = drizzle(queryClient, { schema });

// Export types for use in other packages
export type Database = typeof db;







