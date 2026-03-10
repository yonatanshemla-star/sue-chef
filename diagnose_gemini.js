const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function diagnose() {
  const log = [];
  log.push(`Time: ${new Date().toISOString()}`);
  log.push(`API Key (first 6): ${apiKey?.substring(0, 6)}...`);

  try {
    log.push("\n--- Attempting to list models via v1beta REST API ---");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.models) {
      log.push("Authorized models:");
      data.models.forEach(m => {
        log.push(`- ${m.name} (Supported: ${m.supportedGenerationMethods.join(', ')})`);
      });
    } else {
      log.push("No models found in response.");
      log.push(`Error data: ${JSON.stringify(data)}`);
    }
  } catch (e) {
    log.push(`Error listing models: ${e.message}`);
  }

  log.push("\n--- Testing basic generation with 'gemini-1.5-flash' ---");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    log.push("Success with gemini-1.5-flash!");
  } catch (e) {
    log.push(`Failed gemini-1.5-flash: ${e.message}`);
  }

  log.push("\n--- Testing basic generation with 'gemini-1.5-flash-latest' ---");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent("test");
    log.push("Success with gemini-1.5-flash-latest!");
  } catch (e) {
    log.push(`Failed gemini-1.5-flash-latest: ${e.message}`);
  }

  const output = log.join('\n');
  console.log(output);
  fs.writeFileSync('gemini_diag_output.txt', output);
}

diagnose();
