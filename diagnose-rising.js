#!/usr/bin/env node
// Diagnostic: runs the core getRisingStartups queries directly against the DB
// Usage: node diagnose-rising.js

const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not found in .env'); process.exit(1); }

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  console.log('✅ Connected to database\n');

  // 1. Count startups
  const startups = await client.query(`SELECT id, name, founder_id FROM startups WHERE deleted_at IS NULL ORDER BY name LIMIT 20`);
  console.log(`✅ Startups (non-deleted): ${startups.rowCount}`);
  if (startups.rowCount === 0) {
    console.log('❌ No startups found — this is why the list is empty!');
    await client.end(); return;
  }
  startups.rows.slice(0, 5).forEach(s => console.log(`   - ${s.name} | id: ${s.id} | founder_id: ${s.founder_id}`));
  if (startups.rowCount > 5) console.log(`   ... and ${startups.rowCount - 5} more`);

  // 2. Count posts this week
  const since = new Date(); since.setDate(since.getDate() - 7);
  const posts = await client.query(`
    SELECT p.id, p.startup_id, p.user_id, u.role
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.deleted_at IS NULL
      AND (p.startup_id IS NOT NULL OR u.role = 'startup')
      AND p.created_at >= $1
    LIMIT 20
  `, [since.toISOString()]);
  console.log(`\n✅ Startup posts this week: ${posts.rowCount}`);
  posts.rows.slice(0, 5).forEach(p => console.log(`   - post ${p.id} | startup_id: ${p.startup_id} | user_id: ${p.user_id} | role: ${p.role}`));

  // 3. Count reels
  const startupIds = startups.rows.map(s => s.id);
  const reels = await client.query(`
    SELECT id, startup_id FROM reels
    WHERE deleted_at IS NULL AND startup_id = ANY($1)
    LIMIT 10
  `, [startupIds]);
  console.log(`\n✅ Reels for these startups (all time): ${reels.rowCount}`);

  // 4. Check post likes this week
  if (posts.rowCount > 0) {
    const postIds = posts.rows.map(p => p.id);
    const likes = await client.query(`
      SELECT post_id, COUNT(*) cnt FROM post_likes
      WHERE post_id = ANY($1) AND created_at >= $2
      GROUP BY post_id
    `, [postIds, since.toISOString()]);
    console.log(`\n✅ Post likes this week: ${likes.rowCount} posts with likes`);
    likes.rows.forEach(l => console.log(`   - post ${l.post_id}: ${l.cnt} likes`));
  }

  // 5. Check startup profile table name
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE '%startup%'
    ORDER BY table_name
  `);
  console.log(`\n✅ Startup-related tables: ${tables.rows.map(t => t.table_name).join(', ')}`);

  // 6. Check if startup_profile_visits table exists and has data
  const visitTable = tables.rows.find(t => t.table_name.includes('visit'));
  if (visitTable) {
    const visits = await client.query(`SELECT COUNT(*) cnt FROM ${visitTable.table_name}`);
    console.log(`   - ${visitTable.table_name}: ${visits.rows[0].cnt} total rows`);
  } else {
    console.log('   ⚠️  No startup_profile_visits table found');
  }

  await client.end();
  console.log('\n✅ Done');
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
