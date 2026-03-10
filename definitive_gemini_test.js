require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.GEMINI_API_KEY;

async function runDiagnostics() {
  const tests = [
    { version: 'v1beta', model: 'gemini-1.5-flash' },
    { version: 'v1beta', model: 'models/gemini-1.5-flash' },
    { version: 'v1', model: 'gemini-1.5-flash' },
    { version: 'v1', model: 'models/gemini-1.5-flash' },
    { version: 'v1beta', model: 'gemini-1.5-pro' },
    { version: 'v1beta', model: 'models/gemini-1.5-pro' }
  ];

  console.log("Starting definitive Gemini diagnostics...\n");

  for (const test of tests) {
    const url = `https://generativelanguage.googleapis.com/${test.version}/${test.model}:generateContent?key=${apiKey}`;
    console.log(`Testing: ${test.version} | ${test.model}`);
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }]
        })
      });

      const data = await res.json();
      console.log(`Status: ${res.status}`);
      if (res.ok) {
        console.log("✅ SUCCESS!");
        process.exit(0); // Stop at first success
      } else {
        console.log(`❌ FAILED: ${data.error?.message || JSON.stringify(data)}`);
      }
    } catch (e) {
      console.log(`❌ ERROR: ${e.message}`);
    }
    console.log("-----------------------------------\n");
  }
}

runDiagnostics();
