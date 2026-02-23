const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/evoa'
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT id, name, pitch_deck_url FROM startups WHERE pitch_deck_url IS NOT NULL AND pitch_deck_url != '';");
  console.log(res.rows);
  await client.end();
}
run();
