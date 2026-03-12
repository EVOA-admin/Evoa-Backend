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
  console.log("Raw connection:", conn);
  
  const user1 = await client.query('SELECT id, supabase_user_id, email, role FROM users WHERE id = $1', [conn.connector_id]);
  console.log("Connector:", user1.rows[0]);
  
  const user2 = await client.query('SELECT id, supabase_user_id, email, role FROM users WHERE id = $1', [conn.target_id]);
  console.log("Target:", user2.rows[0]);

  await client.end();
}
run();
