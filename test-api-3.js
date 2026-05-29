import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch'; // or use native fetch if Node 18+

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL || 'https://uocfornrjfikdajrhzog.supabase.co', process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function run() {
  const email = `test-${Date.now()}@example.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  
  if (authError) {
    console.error("Auth error:", authError.message);
    return;
  }
  
  const token = authData.session?.access_token;
  if (!token) {
    console.log("No token, maybe email confirmation required?");
    return;
  }
  
  console.log("Got token. Fetching /api/posts/rising-startups...");
  
  try {
    const res = await fetch('http://localhost:3000/api/posts/rising-startups', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const status = res.status;
    const text = await res.text();
    console.log(`Status: ${status}`);
    console.log(`Response: ${text.slice(0, 1000)}`);
  } catch(e) {
    console.error("Fetch error:", e.message);
  }
}
run();
