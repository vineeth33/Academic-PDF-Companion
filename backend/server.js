
import { GoogleGenAI } from '@google/genai';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

if (!process.env.API_KEY) {
  console.error("FATAL ERROR: API_KEY is not defined in the environment variables. Please create a .env file in the 'backend' directory with your API_KEY.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

app.post('/api/analyze-pdf', async (req, res) => {
  try {
    const {
      base64PdfData, pdfMimeType, documentType,
      simplifiedExplanation, pageByPageExplanation, pageNumbers,
      explainWithAnalogy, analogyTopic, glossaryBuilder,
      quizGenerator, numQuestions, multilingualMode, language,
      chatSupport, initialQuestion
    } = req.body;

    if (!base64PdfData || !pdfMimeType) {
      return res.status(400).json({ error: 'Missing PDF data or MIME type.' });
    }

    let prompt = `You are an advanced academic assistant. Analyze the provided PDF document. The document is a "${documentType}".
Please generate a JSON response with the following structure. Only output the raw JSON object. Do not include any explanatory text, markdown, or any other characters before or after the JSON.
The JSON object should have optional keys: "explanation", "glossary", "quiz", "readingSuggestions", "chatAnswer", "translatedText", "pageExplanations", "analogyExplanation".
If a feature is not applicable or not requested, omit its key from the JSON response or set its value to null.

Based on the document content and the following user requests:
`;

    if (simplifiedExplanation) prompt += `- "explanation": Provide a concise and simplified explanation...\n`;
    if (pageByPageExplanation && pageNumbers) prompt += `- "pageExplanations": Provide detailed explanations for "${pageNumbers}"...\n`;
    if (explainWithAnalogy && analogyTopic) prompt += `- "analogyExplanation": Explain "${analogyTopic}" with an analogy...\n`;
    if (glossaryBuilder) prompt += `- "glossary": Generate a glossary...\n`;
    if (quizGenerator) prompt += `- "quiz": Generate ${numQuestions || 3} quiz questions...\n`;
    if (multilingualMode && language) prompt += `- "translatedText": Translate simplified explanation or summary into ${language}.\n`;
    
    // Only include chatAnswer in the initial analysis if an initialQuestion is provided.
    // If chatSupport is on but no initialQuestion, the user can start chatting via the new UI.
    if (chatSupport && initialQuestion) {
      prompt += `- "chatAnswer": Answer: "${initialQuestion}".\n`;
    }
    
    prompt += `- "readingSuggestions": Provide 2-3 reading suggestions...\n`;
    prompt += `\nEnsure the output is a single, valid JSON object...\n`; // Truncated example part for brevity

    const filePart = { inlineData: { mimeType: pdfMimeType, data: base64PdfData } };
    const textPart = { text: prompt };

    const genAIResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: { parts: [filePart, textPart] },
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an API designed to output only valid, raw JSON...",
      },
    });

    let jsonStr = genAIResponse.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) jsonStr = match[2].trim();

    try {
      const parsedData = JSON.parse(jsonStr);
      res.json(parsedData);
    } catch (parseError) {
      console.error('Failed to parse JSON from AI (initial analysis):', parseError, jsonStr);
      res.status(500).json({ error: "AI returned unexpected format (initial analysis).", rawResponse: jsonStr });
    }

  } catch (error) {
    console.error('Error in /api/analyze-pdf:', error);
    let statusCode = 500;
    let message = 'Failed to analyze PDF due to an internal server error.';
    if (error.message && error.message.includes("API key not valid")) {
        statusCode = 401; message = "Gemini API key is not valid or missing on the server.";
    } else if (error.message) message = error.message;
    res.status(statusCode).json({ error: 'Error processing your request via backend.', details: message });
  }
});

app.post('/api/follow-up-chat', async (req, res) => {
  try {
    const { base64PdfData, pdfMimeType, chatHistory, newMessageText } = req.body;

    if (!base64PdfData || !pdfMimeType) {
      return res.status(400).json({ error: 'Missing PDF data or MIME type for chat context.' });
    }
    if (!chatHistory || !Array.isArray(chatHistory)) {
        return res.status(400).json({ error: 'Missing or invalid chat history.' });
    }
    if (!newMessageText || typeof newMessageText !== 'string' || newMessageText.trim() === "") {
        return res.status(400).json({ error: 'Missing new message text.' });
    }

    // Construct history for Gemini, ensuring PDF context is first (implicitly via system instruction or first turn)
    // For multi-turn chat, Gemini's Chat class manages history.
    // We send the PDF with each turn conceptually. The Chat class handles how to use this.
    
    const modelChat = ai.chats.create({
        model: 'gemini-2.5-flash-preview-04-17', // Ensure model supports chat
        // System instruction for chat can be more conversational
        config: {
           systemInstruction: `You are an academic assistant helping a user understand the provided PDF document. Keep your answers concise and directly related to the document content and the user's questions. The PDF content is provided implicitly via the main analysis; refer to it when answering.`,
        },
        history: chatHistory.filter(msg => msg.role === 'user' || msg.role === 'model').map(msg => ({ // Filter out system_error messages
            role: msg.role,
            parts: [{ text: msg.text }]
        }))
    });

    const filePart = { inlineData: { mimeType: pdfMimeType, data: base64PdfData } };
    // We send the PDF as part of the message content in each turn.
    // The prompt for the message will be the newMessageText.
    const result = await modelChat.sendMessage({
        message: { parts: [ filePart, { text: newMessageText } ] }
    });

    const responseText = result.text;
    res.json({ chatResponse: responseText });

  } catch (error) {
    console.error('Error in /api/follow-up-chat:', error);
    let statusCode = 500;
    let message = 'Failed to get chat follow-up due to an internal server error.';
     if (error.message && error.message.includes("API key not valid")) {
        statusCode = 401; message = "Gemini API key is not valid or missing on the server.";
    } else if (error.message) message = error.message;
    res.status(statusCode).json({ error: 'Error processing your chat follow-up.', details: message });
  }
});


app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
