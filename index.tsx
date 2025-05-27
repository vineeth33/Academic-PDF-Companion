/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from '@google/genai';
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

const DOCUMENT_TYPES = [
  { value: 'research_article', label: 'Research Article' },
  { value: 'textbook_chapter', label: 'Textbook Chapter' },
  { value: 'lecture_notes', label: 'Lecture Notes' },
  { value: 'white_paper', label: 'White Paper' },
  { value: 'case_study', label: 'Case Study' },
];

// Theme toggle icon (simple SVG for demonstration)
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);


function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0].value);
  
  const [simplifiedExplanation, setSimplifiedExplanation] = useState(false);
  const [glossaryBuilder, setGlossaryBuilder] = useState(false);
  const [quizGenerator, setQuizGenerator] = useState(false);
  const [numQuestions, setNumQuestions] = useState<number>(3); // Changed to number
  const [multilingualMode, setMultilingualMode] = useState(false);
  const [language, setLanguage] = useState('');
  const [chatSupport, setChatSupport] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState('');

  const [apiResponse, setApiResponse] = useState<any | null>(null); // Consider defining a more specific type for apiResponse
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  const [theme, setTheme] = useState('light');

  // State for quiz interactions
  const [processedQuiz, setProcessedQuiz] = useState<any[]>([]); // Consider defining a more specific type for quiz items
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Update processedQuiz when apiResponse changes
  useEffect(() => {
    if (apiResponse?.quiz) {
      setProcessedQuiz(
        apiResponse.quiz.map((q: any) => ({ // Added type 'any' for q, consider more specific type
          ...q,
          // Ensure options is an array, important for True/False questions
          options: q.options || ( (q.answer?.toLowerCase() === 'true' || q.answer?.toLowerCase() === 'false') ? ['True', 'False'] : []),
          userSelectedOption: null,
          isAttempted: false,
          showShortAnswer: false, // For short answer types
        }))
      );
    } else {
      setProcessedQuiz([]);
    }
  }, [apiResponse]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf") {
        setPdfFile(file);
        setFileName(file.name);
        setError(null); 
      } else {
        setPdfFile(null);
        setFileName('');
        setError("Please upload a valid PDF file.");
      }
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        } else {
          reject(new Error('Failed to read file as data URL string.'));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pdfFile) {
      setError('Please upload a PDF file.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setApiResponse(null);
    setProcessedQuiz([]); // Clear previous quiz state
    setProgressMessage('Preparing your document...');

    try {
      const base64PdfData: string = await convertFileToBase64(pdfFile);
      setProgressMessage('Generating analysis with AI...');

      let prompt = `You are an advanced academic assistant. Analyze the provided PDF document. The document is a "${documentType}".
      Please generate a JSON response with the following structure. Only output the raw JSON object. Do not include any explanatory text, markdown, or any other characters before or after the JSON.
      The JSON object should have optional keys: "explanation", "glossary", "quiz", "readingSuggestions", "chatAnswer", "translatedText".
      If a feature is not applicable or not requested, omit its key from the JSON response or set its value to null.

      Based on the document content and the following user requests:
      `;

      if (simplifiedExplanation) {
        prompt += `- "explanation": Provide a concise and simplified explanation of the key concepts, suitable for a general audience.\n`;
      }
      if (glossaryBuilder) {
        prompt += `- "glossary": Generate a valid JSON array of objects for a glossary. Each object must strictly contain a "term" (string) and a "definition" (string). Ensure proper comma separation between objects in the array.\n`;
      }
      if (quizGenerator) {
        prompt += `- "quiz": Generate a valid JSON array of quiz items with exactly ${numQuestions || 3} questions. Each item must be an object with:
          - "question": (string) The question text.
          - "type": (string) The type: "multiple_choice" (for MCQs and True/False) or "short_answer".
          - "answer": (string) The correct answer. For True/False questions, this must be "True" or "False".
          - "options": (array of strings) Required for "multiple_choice" type. For True/False questions, this array MUST be ["True", "False"]. For other MCQs, provide 2-4 distinct options. This key should be omitted for "short_answer" type.
        Ensure proper comma separation between objects in the array.\n`;
      }
      if (multilingualMode && language) {
        prompt += `- "translatedText": Translate the simplified explanation (if requested and available) or a brief summary of the document into ${language}.\n`;
      }
      if (chatSupport && initialQuestion) {
        prompt += `- "chatAnswer": Answer the following specific question based on the document: "${initialQuestion}".\n`;
      }
      prompt += `- "readingSuggestions": Provide a list of 2-3 relevant academic reading suggestions (e.g., related paper titles, topics, or authors) based on the document's content. This should always be included.\n`;
      
      prompt += `
      Ensure the output is a single, valid JSON object. For example:
      {
        "explanation": "...",
        "glossary": [ { "term": "Example Term", "definition": "This is an example." } ],
        "quiz": [ 
          { "question": "Is the sky blue?", "type": "multiple_choice", "options": ["True", "False"], "answer": "True" },
          { "question": "What is 2+2?", "type": "short_answer", "answer": "4" }
        ],
        "readingSuggestions": [ "Further reading on Z" ],
        "translatedText": "...",
        "chatAnswer": "..."
      }
      Focus on accuracy and relevance to the PDF content.
      `;
      
      const filePart = {
        inlineData: {
          mimeType: pdfFile.type,
          data: base64PdfData,
        },
      };

      const textPart = { text: prompt };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: { parts: [filePart, textPart] },
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are an API designed to output only valid, raw JSON. Adhere strictly to JSON syntax. Do not include any non-JSON characters, comments, or markdown outside of string values. Ensure all objects and arrays are correctly formatted and properly comma-separated.",
        }
      });
      
      setProgressMessage('Processing AI response...');
      
      let jsonStr = response.text.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }

      try {
        const parsedData = JSON.parse(jsonStr);
        setApiResponse(parsedData);
      } catch (e: any) { // Added type 'any' for e
        console.error("Failed to parse JSON response:", e);
        console.error("Received text for parsing:", jsonStr);
        setError("AI returned an unexpected response format. Please try again. Details: " + e.message);
        setApiResponse(null);
      }

    } catch (err: any) { // Added type 'any' for err
      console.error('API call failed:', err);
      setError(`An error occurred: ${err.message}. Please ensure your API key is correctly configured and try again.`);
      setApiResponse(null);
    } finally {
      setIsLoading(false);
      setProgressMessage(null);
    }
  };

  const handleQuizOptionSelect = (quizIndex: number, option: string) => {
    setProcessedQuiz(prevQuiz =>
      prevQuiz.map((q, idx) =>
        idx === quizIndex
          ? { ...q, userSelectedOption: option, isAttempted: true }
          : q
      )
    );
  };

  const toggleShortAnswer = (quizIndex: number) => {
    setProcessedQuiz(prevQuiz =>
      prevQuiz.map((q, idx) =>
        idx === quizIndex
          ? { ...q, showShortAnswer: !q.showShortAnswer, isAttempted: true }
          : q
      )
    );
  };


  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Academic PDF Companion</h1>
        <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
      </header>

      <form onSubmit={handleSubmit} className="form-section card" aria-labelledby="form-heading">
        <h2 id="form-heading" className="sr-only">Analysis Configuration</h2>
        <div className="form-grid">
            <div className="form-group">
              <label htmlFor="pdf-upload">Upload PDF Document</label>
              <input
                type="file"
                id="pdf-upload"
                accept=".pdf"
                onChange={handleFileChange}
                aria-describedby={fileName ? "file-name-desc" : undefined}
                required
              />
              {fileName && <p id="file-name-desc" className="file-name">Selected: {fileName}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="document-type">Document Type</label>
              <select
                id="document-type"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                {DOCUMENT_TYPES.map((docType) => (
                  <option key={docType.value} value={docType.value}>
                    {docType.label}
                  </option>
                ))}
              </select>
            </div>
        </div>
        
        <fieldset className="form-group">
          <legend>Optional Features</legend>
          <div className="checkbox-options-grid">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="simplified-explanation"
                checked={simplifiedExplanation}
                onChange={(e) => setSimplifiedExplanation(e.target.checked)}
              />
              <label htmlFor="simplified-explanation">Simplified Explanation</label>
            </div>
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="glossary-builder"
                checked={glossaryBuilder}
                onChange={(e) => setGlossaryBuilder(e.target.checked)}
              />
              <label htmlFor="glossary-builder">Glossary Builder</label>
            </div>
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="quiz-generator"
                checked={quizGenerator}
                onChange={(e) => setQuizGenerator(e.target.checked)}
              />
              <label htmlFor="quiz-generator">Quiz Generator</label>
            </div>
            {quizGenerator && (
              <div className="form-group indented-group">
                <label htmlFor="num-questions">Number of Questions:</label>
                <input
                  type="number"
                  id="num-questions"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value, 10) || 1)}
                  min="1"
                  max="10"
                />
              </div>
            )}
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="multilingual-mode"
                checked={multilingualMode}
                onChange={(e) => setMultilingualMode(e.target.checked)}
              />
              <label htmlFor="multilingual-mode">Multilingual Mode</label>
            </div>
            {multilingualMode && (
              <div className="form-group indented-group">
                <label htmlFor="language">Target Language:</label>
                <input
                  type="text"
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g., Spanish, French"
                />
              </div>
            )}
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="chat-support"
                checked={chatSupport}
                onChange={(e) => setChatSupport(e.target.checked)}
              />
              <label htmlFor="chat-support">Chat Support</label>
            </div>
            {chatSupport && (
              <div className="form-group indented-group">
                <label htmlFor="initial-question">Initial Question:</label>
                <textarea
                  id="initial-question"
                  value={initialQuestion}
                  onChange={(e) => setInitialQuestion(e.target.value)}
                  placeholder="Ask a question about the document"
                  rows={3}
                />
              </div>
            )}
          </div>
        </fieldset>

        <button type="submit" className="submit-button" disabled={isLoading || !pdfFile}>
          {isLoading ? 'Analyzing...' : 'Analyze PDF'}
        </button>
      </form>

      {isLoading && (
        <div className="loading-message card" aria-live="polite">
          <div className="spinner"></div>
          <p>{progressMessage || 'Processing...'}</p>
        </div>
      )}
      {error && <p className="error-message card" role="alert">{error}</p>}

      {apiResponse && !isLoading && (
        <section className="response-section" aria-labelledby="response-heading">
          <h2 id="response-heading" className="sr-only">Analysis Results</h2>
          
          {apiResponse.explanation && (
            <article className="card">
              <h3>Simplified Explanation</h3>
              <p>{apiResponse.explanation}</p>
            </article>
          )}

          {apiResponse.translatedText && (
            <article className="card">
              <h3>Translated Text ({language || 'Selected Language'})</h3>
              <p>{apiResponse.translatedText}</p>
            </article>
          )}

          {apiResponse.glossary && apiResponse.glossary.length > 0 && (
            <article className="card">
              <h3>Glossary</h3>
              <ul className="glossary-list">
                {apiResponse.glossary.map((item: { term: string; definition: string }, index: number) => (
                  <li key={index} className="glossary-item">
                    <strong>{item.term}:</strong> {item.definition}
                  </li>
                ))}
              </ul>
            </article>
          )}
          
          {processedQuiz && processedQuiz.length > 0 && (
            <article className="card">
              <h3>Quiz</h3>
              {processedQuiz.map((item, index) => (
                <div key={index} className="quiz-item">
                  <p className="quiz-question"><strong>Q{index + 1}:</strong> {item.question}</p>
                  {item.type === 'multiple_choice' && item.options && item.options.length > 0 && (
                    <div className="quiz-options">
                      {item.options.map((option: string, optIndex: number) => {
                        const isSelected = item.userSelectedOption === option;
                        const isCorrect = option === item.answer;
                        let buttonClass = 'quiz-option-button';
                        if (item.isAttempted) {
                          if (isCorrect) {
                            buttonClass += ' correct';
                          } else if (isSelected && !isCorrect) {
                            buttonClass += ' incorrect';
                          } else {
                             buttonClass += ' disabled'; // Dim unselected options after attempt
                          }
                        }
                        return (
                          <button
                            key={optIndex}
                            className={buttonClass}
                            onClick={() => !item.isAttempted && handleQuizOptionSelect(index, option)}
                            disabled={item.isAttempted && !isSelected && !isCorrect} // Disable other options after attempt unless it's the correct one
                            aria-pressed={isSelected}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {item.type === 'short_answer' && (
                    <div className="short-answer-container">
                      <button 
                        onClick={() => toggleShortAnswer(index)} 
                        className="quiz-option-button"
                        disabled={item.showShortAnswer}
                        aria-expanded={item.showShortAnswer}
                        aria-controls={`short-answer-${index}`}
                      >
                        {item.showShortAnswer ? 'Answer Revealed' : 'Show Answer'}
                      </button>
                      {item.showShortAnswer && (
                        <p id={`short-answer-${index}`} className="quiz-answer"><strong>Answer:</strong> {item.answer}</p>
                      )}
                    </div>
                  )}
                  {item.isAttempted && item.type === 'multiple_choice' && item.userSelectedOption !== item.answer && (
                     <p className="quiz-feedback">Correct answer: {item.answer}</p>
                  )}
                </div>
              ))}
            </article>
          )}
          
          {apiResponse.chatAnswer && (
            <article className="card">
              <h3>Chat Response</h3>
              <p><strong>Your question:</strong> {initialQuestion}</p>
              <p><strong>Answer:</strong> {apiResponse.chatAnswer}</p>
            </article>
          )}

          {apiResponse.readingSuggestions && apiResponse.readingSuggestions.length > 0 && (
             <article className="card">
              <h3>Reading Suggestions</h3>
              <ul className="reading-suggestions-list">
                {apiResponse.readingSuggestions.map((suggestion: string, index: number) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </article>
          )}
        </section>
      )}
       <footer className="app-footer">
          <p>Powered by Gemini</p>
      </footer>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
} else {
  console.error("Root element not found");
}
