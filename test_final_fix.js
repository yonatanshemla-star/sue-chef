async function testFinalFix() {
  require('dotenv').config({ path: '.env.local' });
  const apiKey = process.env.GEMINI_API_KEY;
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  console.log(`Final Test: v1beta | ${model}`);
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "ping" }] }]
      })
    });
    
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    if (res.ok) {
      console.log("✅ FINALLY WORKING!");
    } else {
      console.log(`❌ ERROR: ${JSON.stringify(data)}`);
    }
  } catch (e) {
    console.error(`Fetch error: ${e.message}`);
  }
}

testFinalFix();
