require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const dummyFile = Buffer.from('dummy pdf content');
  console.log('Uploading test.pdf to public bucket...');
  const { data, error } = await supabase.storage
    .from('public')
    .upload('pitch-decks/test.pdf', dummyFile, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (error) {
    console.error('Service Role Upload error:', error.message);
  } else {
    console.log('Service Role Upload success:', data);
  }
}

run().catch(console.error);
