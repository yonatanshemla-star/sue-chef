const https = require('https');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.models) {
        console.log("AUTHORIZED MODELS:");
        json.models.forEach(m => {
          console.log(` - ${m.name}`);
        });
      } else {
        console.log("No models found. Response:", data);
      }
    } catch (e) {
      console.log("Error parsing JSON:", e.message);
      console.log("Raw data:", data);
    }
  });
}).on('error', (e) => {
  console.log("HTTP Get Error:", e.message);
});
