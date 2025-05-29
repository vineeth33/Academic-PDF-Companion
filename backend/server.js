
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

    if (simplifiedExplanation) prompt += `- "explanation": Provide a concise and simplified explanation of the core concepts in the document.\n`;
    if (pageByPageExplanation && pageNumbers) prompt += `- "pageExplanations": Provide detailed explanations for the specified pages or sections: "${pageNumbers}". Each item in the array should be an object with "page_reference" (string, e.g., "Page 5" or "Introduction") and "explanation" (string).\n`;
    if (explainWithAnalogy && analogyTopic) prompt += `- "analogyExplanation": Explain the topic "${analogyTopic}" from the document using a relatable analogy.\n`;
    if (glossaryBuilder) prompt += `- "glossary": Generate a glossary of 5-10 key terms found in the document. Each item in the array should be an object with "term" (string) and "definition" (string).\n`;
    if (quizGenerator) {
        prompt += `- "quiz": Generate ${numQuestions || 3} quiz questions related to the core concepts of the document.
          Include a mix of multiple-choice (MCQ) and true/false questions.
          Each question object in the JSON array must strictly adhere to the following structure:
            "question": "The question text itself, as a string." (string),
            "type": "multiple_choice" OR "true_false" (string, exactly one of these values),
            "options": (array of strings) For MCQ, this will be like ["Option A text", "Option B text", "Option C text"]. For true_false, this will be ["True", "False"]. Each element in this array MUST be a string containing ONLY the option's text. No extra characters, citations, or explanations are allowed within or after any option string in this array. The array must contain only these option strings, and be properly formatted as a JSON array of strings.
            "answer": "The exact text of the correct option from the 'options' array" (string for MCQ) OR "True" OR "False" (string for true_false, matching an option). The answer must be one of the provided options.\n`;
    }
    if (multilingualMode && language) prompt += `- "translatedText": If a simplified explanation or summary is generated, translate it into ${language}.\n`;
    
    if (chatSupport && initialQuestion) {
      prompt += `- "chatAnswer": Answer the following question based on the document: "${initialQuestion}".\n`;
    }
    
    prompt += `- "readingSuggestions": Provide 2-3 relevant reading suggestions if applicable, based on the document's content. Each suggestion should be an object with "title" (string) and "url" (string, a valid web URL). This should be an array of these objects.\n`;
    prompt += `\nImportant: Ensure the output is a single, valid JSON object. Do not add any text or markdown formatting before or after the JSON. All string values within the JSON must be properly escaped.
Specifically for "quiz.options": this MUST be an array of strings, where each string is only the option text. Example: ["Option 1", "Some other option", "Final choice"]. Do NOT include any other data or text within this array or after its elements that would break JSON structure.
`;

    const filePart = { inlineData: { mimeType: pdfMimeType, data: base64PdfData } };
    const textPart = { text: prompt };

    const genAIResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: { parts: [filePart, textPart] },
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an API designed to output only valid, raw JSON as specified in the user's prompt. Do not include any explanatory text, markdown, or any other characters before or after the JSON object. Pay strict attention to array and string formatting within the JSON.",
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
      console.error('Failed to parse JSON from AI (initial analysis):', parseError, '\nRaw response:', jsonStr);
      res.status(500).json({ error: "AI returned an invalid JSON format (initial analysis). Please check the backend logs for the raw response.", rawResponse: jsonStr });
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
    
    const modelChat = ai.chats.create({
        model: 'gemini-2.5-flash-preview-04-17',
        config: {
           systemInstruction: `You are an academic assistant helping a user understand the provided PDF document. Keep your answers concise and directly related to the document content and the user's questions. The PDF content is provided implicitly with the user's message; refer to it when answering.`,
        },
        history: chatHistory.filter(msg => msg.role === 'user' || msg.role === 'model').map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }))
    });

    const filePart = { inlineData: { mimeType: pdfMimeType, data: base64PdfData } };
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

app.post('/api/quiz-feedback', async (req, res) => {
  try {
    const { base64PdfData, pdfMimeType, score, incorrectQuestions } = req.body;

    if (!base64PdfData || !pdfMimeType) {
      return res.status(400).json({ error: 'Missing PDF data or MIME type for context.' });
    }
    if (score === undefined || typeof score !== 'number') {
      return res.status(400).json({ error: 'Missing or invalid score.' });
    }
    if (!incorrectQuestions || !Array.isArray(incorrectQuestions)) {
      return res.status(400).json({ error: 'Missing or invalid incorrect questions array.' });
    }

    let feedbackPrompt = `You are an academic advisor. The user has just completed a quiz on a PDF document that you have access to.
Their score accuracy is ${Math.round(score * 100)}%.

`;

    if (incorrectQuestions.length > 0) {
      feedbackPrompt += `The questions they answered incorrectly are:\n`;
      incorrectQuestions.forEach(q => {
        feedbackPrompt += `- Question: "${q.question}" (The correct answer was: "${q.correctAnswer}")\n`;
      });
      feedbackPrompt += `\nBased on this performance and the content of the PDF document, provide:
1. A brief, encouraging overall suggestion based on their score.
2. Specific areas or topics from the document they should focus on, derived from the incorrectly answered questions. Keep this concise and actionable.
Relate your advice directly to the document's content where possible.
`;
    } else {
      feedbackPrompt += `They answered all questions correctly!
Based on this excellent performance and the content of the PDF document, provide:
1. A brief, congratulatory message.
2. Optionally, suggest one or two advanced topics or further readings related to the document if appropriate.
`;
    }
    feedbackPrompt += `\nRespond with only the feedback text, no JSON, no markdown, just plain text. Be supportive and constructive.`;

    const filePart = { inlineData: { mimeType: pdfMimeType, data: base64PdfData } };
    const textPart = { text: feedbackPrompt };

    const genAIResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: { parts: [filePart, textPart] },
       config: {
        systemInstruction: "You are an API designed to output only plain text feedback. Do not use any markdown.",
      }
    });

    res.json({ feedback: genAIResponse.text });

  } catch (error) {
    console.error('Error in /api/quiz-feedback:', error);
    let statusCode = 500;
    let message = 'Failed to generate quiz feedback due to an internal server error.';
    if (error.message && error.message.includes("API key not valid")) {
        statusCode = 401; message = "Gemini API key is not valid or missing on the server.";
    } else if (error.message) message = error.message;
    res.status(statusCode).json({ error: 'Error processing your quiz feedback request.', details: message });
  }
});


app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
