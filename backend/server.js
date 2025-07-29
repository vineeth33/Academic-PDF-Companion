import { GoogleGenAI } from "@google/genai";
import bcrypt from "bcryptjs"; // For password hashing
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { OAuth2Client } from "google-auth-library"; // For Google Sign-In
import jwt from "jsonwebtoken"; // For JWT

dotenv.config()

const app = express()
const port = process.env.PORT || 3001

// More explicit CORS configuration
const allowedOrigins = [
  "http://localhost:3000", // Common React dev port
  "http://localhost:5173", // Common Vite/Next.js dev port
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://academic-pdf-companion.vercel.app", // << ADDED YOUR DEPLOYED FRONTEND URL
]

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)

      // Allow backend's own origin (e.g., for health checks by Render)
      if (origin === "https://academic-pdf-companion.onrender.com") {
        return callback(null, true)
      }

      // Check if the incoming origin is in our allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      // If not allowed
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`
      return callback(new Error(msg), false)
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // If you use cookies/sessions or authorization headers
  }),
)

// Add security headers to fix Cross-Origin-Opener-Policy issues
app.use((req, res, next) => {
  // Remove or modify restrictive COOP headers that block Google Sign-In
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none")
  next()
})

app.use(express.json({ limit: "50mb" }))

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  if (req.url.includes("/auth/")) {
    console.log("Auth request headers:", req.headers)
    console.log("Auth request body:", req.body)
  }
  next()
})

if (!process.env.API_KEY) {
  console.error(
    "FATAL ERROR: API_KEY is not defined in the environment variables. Please create a .env file with your API_KEY.",
  )
  process.exit(1)
}
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-and-long-jwt-key-for-dev"
if (JWT_SECRET === "your-super-secret-and-long-jwt-key-for-dev") {
  console.warn("WARNING: Using default JWT_SECRET. Please set a strong JWT_SECRET in your .env file for production!")
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
console.log("Attempting to use GOOGLE_CLIENT_ID for backend:", GOOGLE_CLIENT_ID)

if (!GOOGLE_CLIENT_ID) {
  console.error(
    "FATAL ERROR: GOOGLE_CLIENT_ID is not set in environment variables. Google Sign-In will not function on the backend. Please set it in your .env file.",
  )
}
const googleAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID)

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY })

// --- In-memory data stores ---
const users = [] // { id, username, passwordHash (optional), email (optional), googleId (optional), name (optional, from Google) }
// userPdfs: { userId: [{ id, fileName, uploadTimestamp, analysisRecord }] }
const userPdfs = {}
// userQuizzes: { userId: [{ id, pdfFileName, score, quizTimestamp }] }
const userQuizzes = {}
// userChats: { userId: [{ id, pdfFileName, lastActivity, history: [{role, text, id}] }] }
const userChats = {}

// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (token == null) return res.sendStatus(401)

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT Verification Error:", err.message)
      return res.status(403).json({ message: "Token is not valid or expired." })
    }
    req.user = user
    next()
  })
}

// Add a health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() })
})

// Add a test endpoint to verify server is working
app.get("/test", (req, res) => {
  res.json({ message: "Server is working", timestamp: new Date().toISOString() })
})

// --- Auth Routes ---
app.post("/auth/register", async (req, res) => {
  console.log("Register endpoint hit")
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" })
    }
    if (users.find((user) => user.username === username)) {
      return res.status(400).json({ message: "Username already exists" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = {
      id: Date.now().toString(),
      username,
      passwordHash: hashedPassword,
      email: username,
    }
    users.push(newUser)

    userPdfs[newUser.id] = []
    userQuizzes[newUser.id] = []
    userChats[newUser.id] = []

    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: "24h" })
    res
      .status(201)
      .json({ message: "User created successfully", token, user: { id: newUser.id, username: newUser.username } })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ message: "Error registering user" })
  }
})

app.post("/auth/login", async (req, res) => {
  console.log("Login endpoint hit")
  try {
    const { username, password } = req.body
    const user = users.find((u) => u.username === username || u.email === username)
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }
    if (!user.passwordHash) {
      return res.status(400).json({ message: "Please sign in with Google or reset password (if feature exists)." })
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" })
    res.json({ message: "Logged in successfully", token, user: { id: user.id, username: user.username } })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Error logging in" })
  }
})

// Fix the Google auth endpoint path and add proper error handling
app.post("/auth/google/verify", async (req, res) => {
  console.log("=== Google verify endpoint hit ===")
  console.log("Method:", req.method)
  console.log("URL:", req.url)
  console.log("Headers:", req.headers)
  console.log("Body:", req.body)

  // Ensure we always return JSON
  res.setHeader("Content-Type", "application/json")

  if (!GOOGLE_CLIENT_ID) {
    console.error("/auth/google/verify called, but GOOGLE_CLIENT_ID is not configured on the server.")
    return res
      .status(500)
      .json({ message: "Google Sign-In is not configured on the server. Administrator check server logs." })
  }

  try {
    const { token: idToken } = req.body
    if (!idToken) {
      console.log("No ID token provided in request body")
      return res.status(400).json({ message: "ID token is required." })
    }
    console.log("Received ID token for Google verification:", idToken.substring(0, 30) + "...")

    const ticket = await googleAuthClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()

    if (!payload) {
      console.error("Google token verification failed: No payload.")
      return res.status(400).json({ message: "Invalid Google token: No payload." })
    }
    console.log("Google token payload:", payload)

    const googleId = payload["sub"]
    const email = payload["email"]
    const name = payload["name"] || (email ? email.split("@")[0] : `user_${googleId.substring(0, 5)}`)

    let user = users.find((u) => u.googleId === googleId)

    if (!user && email) {
      user = users.find((u) => u.email === email)
      if (user && !user.googleId) {
        user.googleId = googleId
        if (!user.name) user.name = name
      }
    }

    if (!user) {
      const newUserId = Date.now().toString()
      user = {
        id: newUserId,
        username: name,
        email: email,
        googleId: googleId,
        name: name,
        passwordHash: null,
      }
      users.push(user)
      userPdfs[newUserId] = []
      userQuizzes[newUserId] = []
      userChats[newUserId] = []
      console.log("New user created via Google Sign-In:", user)
    } else {
      console.log("Existing user found for Google Sign-In:", user)
    }

    const appToken = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" })
    const response = {
      message: "Google Sign-In successful",
      token: appToken,
      user: { id: user.id, username: user.username },
    }

    console.log("Sending successful response:", response)
    res.json(response)
  } catch (error) {
    console.error("Google Sign-In error in /auth/google/verify:", error.message)
    console.error("Error details:", error)
    res.status(500).json({ message: "Error verifying Google token or processing sign-in.", details: error.message })
  }
})

// --- User Profile/Data Routes ---
app.get("/api/user/me", authenticateToken, (req, res) => {
  const userProfile = users.find((u) => u.id === req.user.id)
  if (!userProfile) return res.status(404).json({ message: "User not found" })
  res.json({
    user: { id: userProfile.id, username: userProfile.username, email: userProfile.email, name: userProfile.name },
  })
})

app.get("/api/user/dashboard-data", authenticateToken, (req, res) => {
  const userId = req.user.id
  const uploads = (userPdfs[userId] || []).map((pdf) => ({
    id: pdf.id,
    fileName: pdf.fileName,
    uploadTimestamp: pdf.uploadTimestamp,
    // analysisRecord is intentionally not sent here to keep dashboard payload light
  }))
  const chats = (userChats[userId] || []).map((chat) => ({
    id: chat.id,
    pdfFileName: chat.pdfFileName,
    lastActivity: chat.lastActivity,
    messagesCount: chat.history ? chat.history.length : 0,
  }))
  const data = {
    uploads: uploads,
    quizzes: userQuizzes[userId] || [],
    chats: chats,
  }
  res.json(data)
})

app.get("/api/user/analysis/:analysisId", authenticateToken, (req, res) => {
  const userId = req.user.id
  const analysisId = req.params.analysisId
  const userUploads = userPdfs[userId] || []
  const analysis = userUploads.find((up) => up.id === analysisId)

  if (!analysis) {
    return res.status(404).json({ message: "Analysis not found or access denied." })
  }
  res.json({
    id: analysis.id,
    fileName: analysis.fileName,
    uploadTimestamp: analysis.uploadTimestamp,
    analysisRecord: analysis.analysisRecord,
  })
})

app.get("/api/user/chat/:chatId", authenticateToken, (req, res) => {
  const userId = req.user.id
  const chatId = req.params.chatId
  const userUserChats = userChats[userId] || []
  const chat = userUserChats.find((c) => c.id === chatId)

  if (!chat) {
    return res.status(404).json({ message: "Chat not found or access denied." })
  }
  res.json({
    id: chat.id,
    pdfFileName: chat.pdfFileName,
    lastActivity: chat.lastActivity,
    history: chat.history || [],
  })
})

// --- Protected API Routes (analyze-pdf, follow-up-chat, quiz-feedback) ---

app.post("/api/analyze-pdf", authenticateToken, async (req, res) => {
  try {
    const {
      base64PdfData,
      pdfMimeType,
      pdfFileName,
      documentType,
      simplifiedExplanation,
      pageByPageExplanation,
      pageNumbers,
      explainWithAnalogy,
      analogyTopic,
      glossaryBuilder,
      quizGenerator,
      numQuestions,
      multilingualMode,
      language,
      chatSupport,
      initialQuestion,
    } = req.body
    const userId = req.user.id

    if (!base64PdfData || !pdfMimeType || !pdfFileName) {
      return res.status(400).json({ error: "Missing PDF data, MIME type, or filename." })
    }

    const requestOptions = {
      documentType,
      simplifiedExplanation,
      pageByPageExplanation,
      pageNumbers,
      explainWithAnalogy,
      analogyTopic,
      glossaryBuilder,
      quizGenerator,
      numQuestions,
      multilingualMode,
      language,
      chatSupport,
      initialQuestion,
    }

    let prompt = `You are an advanced academic assistant. Analyze the provided PDF document named "${pdfFileName}". The document is a "${documentType}".
Please generate a JSON response with the following structure. Only output the raw JSON object. Do not include any explanatory text, markdown, or any other characters before or after the JSON.
The JSON object should have optional keys: "explanation", "glossary", "quiz", "readingSuggestions", "chatAnswer", "translatedText", "pageExplanations", "analogyExplanation".
If a feature is not applicable or not requested, omit its key from the JSON response or set its value to null.
Optionally include "initialQuestion": "${initialQuestion || ""}" and "analogyTopic": "${analogyTopic || ""}" and "language": "${language || ""}" in the response if those features were used.
Based on the document content and the following user requests:
`

    if (simplifiedExplanation)
      prompt += `- "explanation": Provide a concise and simplified explanation of the core concepts in the document.\n`
    if (pageByPageExplanation && pageNumbers)
      prompt += `- "pageExplanations": Provide detailed explanations for the specified pages or sections: "${pageNumbers}". Each item in the array should be an object with "page_reference" (string, e.g., "Page 5" or "Introduction") and "explanation" (string).\n`
    if (explainWithAnalogy && analogyTopic)
      prompt += `- "analogyExplanation": Explain the topic "${analogyTopic}" from the document using a relatable analogy.\n`
    if (glossaryBuilder)
      prompt += `- "glossary": Generate a glossary of 5-10 key terms found in the document. Each item in the array should be an object with "term" (string) and "definition" (string).\n`
    if (quizGenerator) {
      prompt += `- "quiz": Generate ${numQuestions || 3} quiz questions related to the core concepts of the document.
          Include a mix of multiple-choice (MCQ) and true/false questions.
          Each question object in the JSON array must strictly adhere to the following structure:
            "question": "The question text itself, as a string." (string),
            "type": "multiple_choice" OR "true_false" (string, exactly one of these values),
            "options": (array of strings) For MCQ, this will be like ["Option A text", "Option B text", "Option C text"]. For true_false, this will be ["True", "False"]. Each element in this array MUST be a string containing ONLY the option's text. No extra characters, citations, or explanations are allowed within or after any option string in this array. The array must contain only these option strings, and be properly formatted as a JSON array of strings.
            "answer": "The exact text of the correct option from the 'options' array" (string for MCQ) OR "True" OR "False" (string for true_false, matching an option). The answer must be one of the provided options.\n`
    }
    if (multilingualMode && language)
      prompt += `- "translatedText": If a simplified explanation or summary is generated, translate it into ${language}.\n`

    if (chatSupport && initialQuestion) {
      prompt += `- "chatAnswer": Answer the following question based on the document: "${initialQuestion}".\n`
    }

    prompt += `- "readingSuggestions": Provide 2-3 relevant reading suggestions if applicable, based on the document's content. Each suggestion should be an object with "title" (string) and "url" (string, a valid web URL). This should be an array of these objects.\n`
    prompt += `\nImportant: Ensure the output is a single, valid JSON object. Do not add any text or markdown formatting before or after the JSON. All string values within the JSON must be properly escaped.
Specifically for "quiz.options": this MUST be an array of strings, where each string is only the option text. Example: ["Option 1", "Some other option", "Final choice"]. Do NOT include any other data or text within this array or after its elements that would break JSON structure.
`

    const filePart = { inlineData: { mimeType: pdfMimeType, data: base64PdfData } }
    const textPart = { text: prompt }

    const genAIResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: { parts: [filePart, textPart] },
      config: {
        responseMimeType: "application/json",
        systemInstruction:
          "You are an API designed to output only valid, raw JSON as specified in the user's prompt. Do not include any explanatory text, markdown, or any other characters before or after the JSON object. Pay strict attention to array and string formatting within the JSON.",
      },
    })

    let jsonStr = genAIResponse.text.trim()
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s
    const match = jsonStr.match(fenceRegex)
    if (match && match[2]) jsonStr = match[2].trim()

    try {
      const parsedData = JSON.parse(jsonStr)

      parsedData.requestOptions = requestOptions
      parsedData.initialQuestion = initialQuestion
      parsedData.analogyTopic = analogyTopic
      parsedData.language = language

      if (!userPdfs[userId]) userPdfs[userId] = []
      userPdfs[userId].unshift({
        id: Date.now().toString(),
        fileName: pdfFileName,
        uploadTimestamp: new Date().toISOString(),
        analysisRecord: parsedData,
      })
      if (userPdfs[userId].length > 10) userPdfs[userId].pop()

      if (parsedData.chatAnswer && chatSupport && initialQuestion) {
        if (!userChats[userId]) userChats[userId] = []
        const newChatId = Date.now().toString()
        const initialChatHistory = [
          { role: "user", text: initialQuestion, id: `${newChatId}_user_init` },
          { role: "model", text: parsedData.chatAnswer, id: `${newChatId}_model_init` },
        ]

        userChats[userId].unshift({
          id: newChatId,
          pdfFileName: pdfFileName,
          lastActivity: new Date().toISOString(),
          history: initialChatHistory,
        })
        if (userChats[userId].length > 5) userChats[userId].pop()
      }
      res.json(parsedData)
    } catch (parseError) {
      console.error("Failed to parse JSON from AI (initial analysis):", parseError, "\nRaw response:", jsonStr)
      res.status(500).json({
        error:
          "AI returned an invalid JSON format (initial analysis). Please check the backend logs for the raw response.",
        rawResponse: jsonStr,
      })
    }
  } catch (error) {
    console.error("Error in /api/analyze-pdf:", error)
    let statusCode = 500
    let message = "Failed to analyze PDF due to an internal server error."
    if (error.message && error.message.includes("API key not valid")) {
      statusCode = 401
      message = "Gemini API key is not valid or missing on the server."
    } else if (error.message) {
      message = error.message
    }
    res.status(statusCode).json({ error: "Error processing your request via backend.", details: message })
  }
})

app.post("/api/follow-up-chat", authenticateToken, async (req, res) => {
  const userId = req.user.id // For logging
  console.log(`\n--- Follow-up Chat Request for user ${userId} ---`)
  try {
    const { base64PdfData, pdfMimeType, pdfFileName, priorChatHistory, newMessageText, newUserMessageId } = req.body

    console.log(`Follow-up: Received for PDF: "${pdfFileName}", User: ${userId}`)
    console.log(`Follow-up: newMessageText: "${newMessageText}" (ID: ${newUserMessageId})`)
    console.log(`Follow-up: priorChatHistory length: ${priorChatHistory ? priorChatHistory.length : "N/A"}`)
    if (priorChatHistory && priorChatHistory.length > 0) {
      console.log(
        `Follow-up: Last prior message - Role: ${priorChatHistory[priorChatHistory.length - 1].role}, Text: "${priorChatHistory[priorChatHistory.length - 1].text.substring(0, 50)}..."`,
      )
    }

    if (!base64PdfData || !pdfMimeType || !pdfFileName) {
      return res.status(400).json({ error: "Missing PDF data, MIME type or filename for chat context." })
    }
    if (!priorChatHistory || !Array.isArray(priorChatHistory)) {
      return res.status(400).json({ error: "Missing or invalid prior chat history." })
    }
    if (!newMessageText || typeof newMessageText !== "string" || newMessageText.trim() === "") {
      return res.status(400).json({ error: "Missing new message text." })
    }
    if (!newUserMessageId) {
      return res.status(400).json({ error: "Missing new user message ID." })
    }

    // COMPLETELY NEW APPROACH: Instead of using chat history with the API,
    // we'll construct a single prompt with the entire conversation history
    // and send it as a single request

    // Filter out system_error messages and only keep user/model messages
    const validMessages = priorChatHistory.filter(
      (msg) =>
        msg &&
        typeof msg.role === "string" &&
        ["user", "model"].includes(msg.role.toLowerCase().trim()) &&
        msg.text &&
        typeof msg.text === "string",
    )

    // Construct conversation history as text
    let conversationContext = ""
    if (validMessages.length > 0) {
      conversationContext = "Here is the conversation history so far:\n\n"
      validMessages.forEach((msg) => {
        const role = msg.role.toLowerCase().trim() === "user" ? "User" : "Assistant"
        conversationContext += `${role}: ${msg.text}\n\n`
      })
    }

    // Add the new user message
    conversationContext += `User: ${newMessageText}\n\n`

    // Create the full prompt
    const prompt = `You are an academic assistant helping with the PDF document "${pdfFileName}".
${conversationContext}
Based on the PDF content and the conversation above, provide a helpful response to the user's latest message.
Keep your answer concise, informative, and directly related to the document content.`

    console.log("Follow-up: Sending message to Gemini model with single-request approach...")

    const filePart = { inlineData: { mimeType: pdfMimeType, data: base64PdfData } }
    const textPart = { text: prompt }

    // Use generateContent instead of chat API
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: { parts: [filePart, textPart] },
      systemInstruction:
        "You are an academic assistant helping a user understand a PDF document. Provide clear, concise, and accurate responses based on the document content.",
    })

    const responseText = result.text
    console.log(`Follow-up: Received response from Gemini: "${responseText.substring(0, 100)}..."`)
    const newModelMessageId = `${Date.now()}_model_followup`

    const userMessageForStorage = { role: "user", text: newMessageText, id: newUserMessageId }
    const modelMessageForStorage = { role: "model", text: responseText, id: newModelMessageId }
    const updatedFullHistory = [...priorChatHistory, userMessageForStorage, modelMessageForStorage]

    if (!userChats[userId]) userChats[userId] = []
    let chatSession = userChats[userId].find((c) => c.pdfFileName === pdfFileName)

    if (chatSession) {
      chatSession.lastActivity = new Date().toISOString()
      chatSession.history = updatedFullHistory
      userChats[userId] = [chatSession, ...userChats[userId].filter((c) => c.id !== chatSession.id)]
    } else {
      chatSession = {
        id: Date.now().toString(),
        pdfFileName: pdfFileName,
        lastActivity: new Date().toISOString(),
        history: updatedFullHistory,
      }
      userChats[userId].unshift(chatSession)
    }
    if (userChats[userId].length > 5) userChats[userId].pop()

    res.json({ chatResponse: responseText, modelMessageId: newModelMessageId })
  } catch (error) {
    console.error(`Error in /api/follow-up-chat for user ${userId}:`, error.message)
    console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2))

    if (error.response && error.response.data) {
      console.error("Gemini API Error Data:", JSON.stringify(error.response.data, null, 2))
    }
    if (error.details) {
      // For some GoogleGenAIError types
      console.error("GoogleGenAI Error Details:", error.details)
    }
    if (error.cause) {
      console.error("Error Cause:", error.cause)
    }

    let statusCode = 500
    let message = "Failed to get chat follow-up due to an internal server error."
    if (error.message && error.message.includes("API key not valid")) {
      statusCode = 401
      message = "Gemini API key is not valid or missing on the server."
    } else if (error.message && error.message.toLowerCase().includes("safety")) {
      statusCode = 400 // Bad request due to safety
      message = "The response was blocked due to safety concerns. Please rephrase your request."
    } else if (error.message && error.message.toLowerCase().includes("token")) {
      statusCode = 400 // Bad request due to token limits
      message = "The conversation history is too long. Please start a new chat or try a shorter message."
    } else if (error.message) {
      message = error.message
    }
    res.status(statusCode).json({ error: "Error processing your chat follow-up.", details: message })
  }
})

app.post("/api/quiz-feedback", authenticateToken, async (req, res) => {
  try {
    const { base64PdfData, pdfMimeType, pdfFileName, score, incorrectQuestions } = req.body
    const userId = req.user.id

    if (!base64PdfData || !pdfMimeType || !pdfFileName) {
      return res.status(400).json({ error: "Missing PDF data, MIME type or filename for context." })
    }
    if (score === undefined || typeof score !== "number") {
      return res.status(400).json({ error: "Missing or invalid score." })
    }
    if (!incorrectQuestions || !Array.isArray(incorrectQuestions)) {
      return res.status(400).json({ error: "Missing or invalid incorrect questions array." })
    }

    let feedbackPrompt = `You are an academic advisor. The user has just completed a quiz on a PDF document named "${pdfFileName}" that you have access to.
Their score accuracy is ${Math.round(score * 100)}%.

`

    if (incorrectQuestions.length > 0) {
      feedbackPrompt += `The questions they answered incorrectly are:\n`
      incorrectQuestions.forEach((q) => {
        feedbackPrompt += `- Question: "${q.question}" (User answered: "${q.userAnswer}", Correct answer was: "${q.correctAnswer}")\n`
      })
      feedbackPrompt += `\nBased on this performance and the content of the PDF document, provide:
1. A brief, encouraging overall suggestion based on their score.
2. Specific areas or topics from the document they should focus on, derived from the incorrectly answered questions. Keep this concise and actionable.
Relate your advice directly to the document's content where possible.
`
    } else {
      feedbackPrompt += `They answered all questions correctly!
Based on this excellent performance and the content of the PDF document, provide:
1. A brief, congratulatory message.
2. Optionally, suggest one or two advanced topics or further readings related to the document if appropriate.
`
    }
    feedbackPrompt += `\nRespond with only the feedback text, no JSON, no markdown, just plain text. Be supportive and constructive.`

    const filePart = { inlineData: { mimeType: pdfMimeType, data: base64PdfData } }
    const textPart = { text: feedbackPrompt }

    const genAIResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: { parts: [filePart, textPart] },
      config: {
        systemInstruction: "You are an API designed to output only plain text feedback. Do not use any markdown.",
      },
    })

    if (!userQuizzes[userId]) userQuizzes[userId] = []
    userQuizzes[userId].unshift({
      id: Date.now().toString(),
      pdfFileName: pdfFileName,
      score: score,
      quizTimestamp: new Date().toISOString(),
    })
    if (userQuizzes[userId].length > 10) userQuizzes[userId].pop()

    res.json({ feedback: genAIResponse.text })
  } catch (error) {
    console.error("Error in /api/quiz-feedback:", error)
    let statusCode = 500
    let message = "Failed to generate quiz feedback due to an internal server error."
    if (error instanceof Error) {
      if (error.message && error.message.includes("API key not valid")) {
        statusCode = 401
        message = "Gemini API key is not valid or missing on the server."
      } else if (error.message) {
        message = error.message
      }
    }
    res.status(statusCode).json({ error: "Error processing your quiz feedback request.", details: message })
  }
})

// Catch-all error handler for unmatched routes
app.use("*", (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`)
  res.status(404).json({
    error: "Route not found",
    method: req.method,
    url: req.originalUrl,
    availableRoutes: [
      "GET /health",
      "GET /test",
      "POST /auth/register",
      "POST /auth/login",
      "POST /auth/google/verify",
      "GET /api/user/me",
      "GET /api/user/dashboard-data",
      "POST /api/analyze-pdf",
      "POST /api/follow-up-chat",
      "POST /api/quiz-feedback",
    ],
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err)
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
    timestamp: new Date().toISOString(),
  })
})

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`)
  console.log("Available endpoints:")
  console.log("  GET /health - Health check")
  console.log("  GET /test - Test endpoint")
  console.log("  POST /auth/register - User registration")
  console.log("  POST /auth/login - User login")
  console.log("  POST /auth/google/verify - Google Sign-In verification")
  console.log("  GET /api/user/me - Get current user")
  console.log("  GET /api/user/dashboard-data - Get user dashboard data")
  console.log("  POST /api/analyze-pdf - Analyze PDF")
  console.log("  POST /api/follow-up-chat - Follow-up chat")
  console.log("  POST /api/quiz-feedback - Quiz feedback")
  console.log("Ensure GOOGLE_CLIENT_ID is set in your environment for Google Sign-In to function on the backend.")
})
