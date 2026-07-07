require('dotenv').config({ path: './.env' });
const fs = require('fs');

async function test() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.error("Missing keys", { url, key });
    return;
  }

  const endpoint = `${url}/storage/v1/object/smartresto-images/test/test.txt`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'apikey': key,
      'Content-Type': 'text/plain',
      'x-upsert': 'true' 
    },
    body: "Hello world"
  });

  if (!response.ok) {
    console.error("Upload failed", response.status, await response.text());
  } else {
    console.log("Upload success!", await response.json());
  }
}

test();
