const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const pool = new Pool({
    host: 'localhost', port: 5432, database: 'student_xerox_billing',
    user: 'postgres', password: 'postgres'
  });
  const hash = await bcrypt.hash('admin123', 10);
  console.log('New hash:', hash);
  await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, 'admin']);
  const r = await pool.query('SELECT password_hash FROM users WHERE username = $1', ['admin']);
  console.log('Stored:', r.rows[0].password_hash.substring(0, 30));
  await pool.end();
}
main().catch(console.error);
