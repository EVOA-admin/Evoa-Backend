/**
 * One-time fix script: updates the PostgreSQL 'users_role_enum' type
 * to add 'startup' and remove deprecated 'founder' value.
 *
 * Run: node fix-role-enum.js
 */

require('dotenv').config();
const { Client } = require('pg');

async function fixRoleEnum() {
    const client = new Client({
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        user: process.env.DATABASE_USERNAME || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'evoa',
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // 1. Check the current enum values
        const { rows: currentEnum } = await client.query(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'users_role_enum'
      ORDER BY e.enumsortorder
    `);
        console.log('📋 Current enum values:', currentEnum.map(r => r.enumlabel));

        const labels = currentEnum.map(r => r.enumlabel);

        // 2. Add 'startup' if it doesn't exist yet
        if (!labels.includes('startup')) {
            await client.query(`ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'startup'`);
            console.log("✅ Added 'startup' to enum");
        } else {
            console.log("ℹ️  'startup' already exists in enum");
        }

        // 3. If users have 'founder' role, migrate them to 'startup'
        if (labels.includes('founder')) {
            const { rowCount } = await client.query(`
        UPDATE users SET role = 'startup' WHERE role = 'founder'
      `);
            console.log(`✅ Migrated ${rowCount} user(s) from 'founder' → 'startup'`);
        }

        // 4. Print final enum values
        const { rows: finalEnum } = await client.query(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'users_role_enum'
      ORDER BY e.enumsortorder
    `);
        console.log('✅ Final enum values:', finalEnum.map(r => r.enumlabel));
        console.log('🎉 Done! Restart the backend server.');

    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.code === 'ECONNREFUSED') {
            console.error('   Make sure PostgreSQL is running on localhost:5432');
        }
        process.exit(1);
    } finally {
        await client.end();
    }
}

fixRoleEnum();
