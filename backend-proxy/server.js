// backend-proxy/server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Google Generative AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Middleware
// For production, configure CORS to only allow your frontend's domain:
// app.use(cors({ origin: 'https://your-frontend-domain.com' }));
app.use(cors()); // Allow all origins for development
app.use(express.json()); // To parse JSON request bodies

// Helper function to format chat history for Gemini
function formatChatHistoryForGemini(messages, systemInstruction) {
  let history = [];
  if (systemInstruction) {
    // Prepend system instruction to the very first user message if it exists
    if (messages.length > 0 && messages[0].role === 'user') {
      history.push({
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\n${messages[0].content}` }]
      });
      messages = messages.slice(1); // Remove the first message as it's now in history
    } else {
      // If no initial user message, or if system instruction should start the conversation
      // Gemini doesn't have a 'system' role. It's often handled as part of the first prompt
      // or implicitly in the model's tuning. For this setup, we'll ensure it's part of
      // the first interaction.
      // If you want a specific "AI" opening based on system, you might add a model response here.
    }
  }

  messages.forEach(msg => {
    history.push({
      role: msg.role === 'user' ? 'user' : 'model', // Map 'assistant' to 'model'
      parts: [{ text: msg.content }]
    });
  });
  return history;
}

// --------------------------------------------------------------------------
// API Proxy Endpoint for Document Drafter (generateDocument)
// --------------------------------------------------------------------------
app.post('/api/gemini-generate-document', async (req, res) => {
  try {
    const { system, messages } = req.body; // messages is expected to be an array with one user message

    const fullPrompt = `${system}\n\n${messages[0].content}`; // Combine system and user message for generateContent

    const result = await model.generateContent(fullPrompt); // Use generateContent for single turn
    const response = await result.response;
    const text = response.text();

    res.json({ text: text }); // Return text in a format frontend expects

  } catch (error) {
    console.error('Error in /api/gemini-generate-document:', error);
    res.status(500).json({ error: 'Failed to generate document.', details: error.message });
  }
});

// --------------------------------------------------------------------------
// API Proxy Endpoint for Case Analyzer (analyzeCase)
// --------------------------------------------------------------------------
app.post('/api/gemini-analyze-case', async (req, res) => {
  try {
    const { system, messages } = req.body; // messages is expected to be an array with one user message

    const fullPrompt = `${system}\n\n${messages[0].content}`; // Combine system and user message

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    res.json({ text: text });

  } catch (error) {
    console.error('Error in /api/gemini-analyze-case:', error);
    res.status(500).json({ error: 'Failed to analyze case.', details: error.message });
  }
});

// --------------------------------------------------------------------------
// API Proxy Endpoint for Navigator Chat (sendChat)
// --------------------------------------------------------------------------
app.post('/api/gemini-chat', async (req, res) => {
  try {
    const { system, messages } = req.body;

    const chatHistoryForGemini = formatChatHistoryForGemini(messages.slice(), system); // Pass a copy and system

    // The last message in messages is the current user's message
    const latestUserMessage = chatHistoryForGemini[chatHistoryForGemini.length - 1].parts[0].text;
    const historyWithoutLatest = chatHistoryForGemini.slice(0, -1);


    const chat = model.startChat({
      history: historyWithoutLatest,
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    const result = await chat.sendMessage(latestUserMessage);
    const response = await result.response;
    const text = response.text();

    res.json({ text: text });

  } catch (error) {
    console.error('Error in /api/gemini-chat:', error);
    res.status(500).json({ error: 'Failed to get chat response.', details: error.message });
  }
});

// --------------------------------------------------------------------------
// API Proxy Endpoint for Demo Document Generation
// --------------------------------------------------------------------------
app.post('/api/gemini-generate-document-demo', async (req, res) => {
  try {
    const { system, messages } = req.body; // messages is expected to be an array with one user message

    const fullPrompt = `${system}\n\n${messages[0].content}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    res.json({ text: text });

  } catch (error) {
    console.error('Error in /api/gemini-generate-document-demo:', error);
    res.status(500).json({ error: 'Failed to generate demo document.', details: error.message });
  }
});

// --------------------------------------------------------------------------
// API Proxy Endpoint for Demo Chat
// --------------------------------------------------------------------------
app.post('/api/gemini-chat-demo', async (req, res) => {
  try {
    const { system, messages } = req.body;

    const chatHistoryForGemini = formatChatHistoryForGemini(messages.slice(), system);

    const latestUserMessage = chatHistoryForGemini[chatHistoryForGemini.length - 1].parts[0].text;
    const historyWithoutLatest = chatHistoryForGemini.slice(0, -1);

    const chat = model.startChat({
      history: historyWithoutLatest,
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    const result = await chat.sendMessage(latestUserMessage);
    const response = await result.response;
    const text = response.text();

    res.json({ text: text });

  } catch (error) {
    console.error('Error in /api/gemini-chat-demo:', error);
    res.status(500).json({ error: 'Failed to get demo chat response.', details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend proxy running on http://localhost:${PORT}`);
});
