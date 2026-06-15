import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

let pool: Pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
} else {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'boss_tech_billing',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Auto-run migrations on startup
export async function runMigrations() {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')");
    if (!result.rows[0].exists) {
      console.log('Running database migrations...');
      const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8').replace(/CREATE EXTENSION[^;]+;/g, '');
        await client.query(schema);
        console.log('Database migrations completed successfully.');
      }
    }
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    client.release();
  }
}

export default pool;
