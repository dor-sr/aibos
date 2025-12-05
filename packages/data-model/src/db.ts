import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// For use in server-side code
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL not set. Database operations will fail.');
}

// Connection for queries
const queryClient = postgres(connectionString ?? '', {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Drizzle instance with schema
export const db = drizzle(queryClient, { schema });

// Export types for use in other packages
export type Database = typeof db;





