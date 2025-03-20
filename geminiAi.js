const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config(); // Load API key from .env file

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Error: Missing GEMINI_API_KEY. Set it in your .env file.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Use correct model name

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

// Function to interact with Gemini AI
async function getGeminiResponse(inputText) {
  try {
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    const result = await chatSession.sendMessage(inputText);
    return result.response.text(); // Return AI response instead of logging
  } catch (error) {
    console.error( "Error calling Gemini API:", error);
    return "An error occurred while processing your request.";
  }
}

// Export the function for use in other files
module.exports = { getGeminiResponse };