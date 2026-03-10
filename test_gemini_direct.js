async function testGeminiDirect() {
  require('dotenv').config({ path: '.env.local' });
  const apiKey = process.env.GEMINI_API_KEY;
  const model = "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  console.log(`Testing direct fetch to: ${url.replace(apiKey, 'HIDDEN')}`);
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Say hello" }] }]
      })
    });
    
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log(`Response: ${JSON.stringify(data, null, 2)}`);
  } catch (e) {
    console.error(`Fetch error: ${e.message}`);
  }
}

testGeminiDirect();
