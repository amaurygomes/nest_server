import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

export type DrizzleDb = PostgresJsDatabase<typeof schema>;
