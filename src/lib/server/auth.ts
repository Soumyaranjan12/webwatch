import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth';
import { PostgresDialect } from 'kysely';
import { Pool } from 'pg';

const databaseUrl = env.WEBWATCH_LOCAL_DATABASE_URL ?? env.DATABASE_URL;
const secret = env.BETTER_AUTH_SECRET;
const baseURL = env.BETTER_AUTH_URL;

if (!databaseUrl || !secret || !baseURL) {
  throw new Error('Missing Better Auth server environment variables.');
}

const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 10_000,
  max: 5,
  ssl: false
});

export const auth = betterAuth({
  appName: 'WebWatch',
  baseURL,
  secret,
  database: {
    dialect: new PostgresDialect({ pool }),
    type: 'postgres',
    schemaName: 'webwatch_auth'
  },
  emailAndPassword: {
    enabled: true
  },
  trustedOrigins: [
    'http://localhost:18473',
    'http://127.0.0.1:18473',
    'http://192.168.0.7:18473'
  ]
});
