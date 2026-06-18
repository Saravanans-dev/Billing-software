const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://free_user:3BNT4n3tJOtVoSv3CvdA6nkv69VlWS65@dpg-d8o17kjsq97s73buom5g-a.oregon-postgres.render.com:5432/free_billing',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});
pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public'").then(r => {
  console.log('Tables:', r.rows.map(x => x.tablename).join(', '));
  if (r.rows.some(x => x.tablename === 'users')) {
    return pool.query('SELECT COUNT(*) FROM users');
  }
}).then(r => {
  if (r) console.log('Users count:', r.rows[0].count);
}).catch(e => console.error('Error:', e.message)).finally(() => pool.end());
