require('dotenv').config();
const { Client } = require('pg');

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/evoa'
    });

    try {
        await client.connect();

        // The preferred Supabase way is to create Postgres policies on storage.objects
        await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public uploads to pitch-decks'
        ) THEN
            CREATE POLICY "Allow public uploads to pitch-decks" 
            ON storage.objects FOR INSERT 
            WITH CHECK (bucket_id = 'pitch-decks');
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public updates to pitch-decks'
        ) THEN
            CREATE POLICY "Allow public updates to pitch-decks" 
            ON storage.objects FOR UPDATE 
            USING (bucket_id = 'pitch-decks');
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public read to pitch-decks'
        ) THEN
            CREATE POLICY "Allow public read to pitch-decks" 
            ON storage.objects FOR SELECT 
            USING (bucket_id = 'pitch-decks');
        END IF;
      END
      $$;
    `);

        console.log('Successfully created RLS policies for pitch-decks bucket');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

run();
