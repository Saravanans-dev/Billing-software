import pool from './database';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  try {
    const schemaPath = path.join(__dirname, '..', '..', '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Database schema migrated successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
