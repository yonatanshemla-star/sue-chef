const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function listAllModels() {
  try {
    const models = await genAI.listModels();
    console.log("AUTHORIZED MODELS FROM SDK:");
    models.models.forEach(m => {
      console.log(` - ${m.name} (Methods: ${m.supportedGenerationMethods.join(', ')})`);
    });
  } catch (e) {
    console.error("SDK listModels Error:", e.message);
  }
}

listAllModels();
