
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        console.log(`✅ ${modelName} Success:`, response.text().substring(0, 50));
        return true;
    } catch (error) {
        console.error(`❌ ${modelName} Failed:`, error.message);
        return false;
    }
}

async function run() {
    await testModel("gemini-1.5-flash");
    await testModel("gemini-2.0-flash");
    await testModel("gemini-2.0-flash-exp");
}

run();
