/**
 * apply-rls.js — Runs rls_policies.sql against the Supabase (PostgreSQL) database.
 * Usage: node apply-rls.js
 */
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
    const sql = fs.readFileSync(path.join(__dirname, 'rls_policies.sql'), 'utf8');

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        console.log('Connecting to Supabase...');
        await client.connect();
        console.log('Connected. Applying RLS policies...\n');

        await client.query(sql);

        console.log('✅ All RLS policies applied successfully!\n');

        // Print a summary of enabled tables
        const result = await client.query(`
            SELECT tablename, rowsecurity
            FROM pg_tables
            WHERE schemaname = 'public'
              AND tablename IN (
                'users','startups','investors','incubators','posts',
                'reels','reel_likes','reel_saves','reel_views','reel_comments','reel_shares',
                'post_likes','post_saves','post_comments','post_website_clicks',
                'follows','conversations','messages','message_requests',
                'meetings','notifications','stories','user_connections',
                'hashtags','investor_ai_logs'
              )
            ORDER BY tablename;
        `);

        console.log('Table RLS Status:');
        console.log('─'.repeat(40));
        result.rows.forEach(row => {
            const status = row.rowsecurity ? '🔒 ENABLED' : '⚠️  DISABLED';
            console.log(`  ${row.tablename.padEnd(30)} ${status}`);
        });

        // Print active policies count
        const policyResult = await client.query(`
            SELECT COUNT(*) as count FROM pg_policies
            WHERE schemaname = 'public';
        `);
        console.log('\n─'.repeat(40));
        console.log(`  Total active RLS policies: ${policyResult.rows[0].count}`);

    } catch (err) {
        console.error('❌ Error applying RLS:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
