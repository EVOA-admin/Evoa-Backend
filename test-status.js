const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res = await client.query('SELECT * FROM user_connections ORDER BY created_at DESC LIMIT 1');
  if (res.rows.length === 0) {
      console.log("No connections");
      return;
  }
  const conn = res.rows[0];
  console.log("Testing with connector:", conn.connector_id, "target:", conn.target_id);
  
  // Fake the logic of TypeORM findOne
  const findRes = await client.query('SELECT * FROM user_connections WHERE connector_id = $1 AND target_id = $2', [conn.connector_id, conn.target_id]);
  console.log("FindOne found:", findRes.rows.length, "rows.");
  await client.end();
}
run();
