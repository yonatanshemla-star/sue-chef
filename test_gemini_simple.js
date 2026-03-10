const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

function parseEnv() {
    const envPath = path.join(__dirname, '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    for (const line of lines) {
        const [key, ...val] = line.split('=');
        if (key && val.length) {
            env[key.trim()] = val.join('=').trim();
        }
    }
    return env;
}

async function testGemini() {
    const env = parseEnv();
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No Gemini key");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    console.log("Testing Gemini with simple text prompt...");
    try {
        const result = await model.generateContent("Say 'hello world' if you can hear me.");
        const response = await result.response;
        console.log("Success:", response.text());
        fs.writeFileSync('gemini_test.txt', 'OK: ' + response.text());
    } catch (e) {
        console.error("Gemini failed:", e);
        fs.writeFileSync('gemini_test.txt', 'ERROR: ' + e.message);
    }
}

testGemini();
