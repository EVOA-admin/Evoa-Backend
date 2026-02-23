const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'evoa',
  password: 'postgres',
  port: 5432,
});

async function run() {
  const res = await pool.query('SELECT id, name FROM investors LIMIT 1');
  console.log(res.rows);
  process.exit(0);
}
run();
