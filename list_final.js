const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;
console.log("Using API Key (first 6):", apiKey.substring(0, 6));

async function listModels() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    if (data.models) {
      console.log("AUTHORIZED MODELS LIST:");
      data.models.forEach(m => {
        console.log(`- ${m.name}`);
      });
    } else {
      console.log("No models field in response:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

listModels();
