import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch'; 

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL || 'https://uocfornrjfikdajrhzog.supabase.co', process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function run() {
  const email = `testuser999@gmail.com`; // a common format
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'password123!'
  });
  
  let token = authData?.session?.access_token;
  
  if (authError) {
    console.error("Auth error:", authError.message);
    // Let's try to sign in instead
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: 'password123!'
    });
    if (!signInError && signInData?.session?.access_token) {
        token = signInData.session.access_token;
    } else {
        console.log("SignIn error:", signInError?.message);
        return;
    }
  }
  
  if (!token) {
    console.log("No token available.");
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
    console.log(`Response: ${text.slice(0, 500)}`);
  } catch(e) {
    console.error("Fetch error:", e.message);
  }
}
run();
