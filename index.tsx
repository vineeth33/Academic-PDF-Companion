"use client"

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import jsPDF from "jspdf";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";

// IMPORTANT: Replace with your actual Google Client ID
const GOOGLE_CLIENT_ID = "520295613669-1p3cov5p9c0c2a01sv0ktmhn4c288vbc.apps.googleusercontent.com"; 

const DOCUMENT_TYPES = [
  { value: "research_article", label: "Research Article" },
  { value: "textbook_chapter", label: "Textbook Chapter" },
  { value: "lecture_notes", label: "Lecture Notes" },
  { value: "white_paper", label: "White Paper" },
  { value: "case_study", label: "Case Study" },
]

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
)
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
)
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7,10 12,15 17,10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
)
const PrintIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6,9 6,2 18,2 18,9"></polyline><path d="M6,18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2H20a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H18"></path><rect x="6" y="14" width="12" height="8"></rect>
  </svg>
)
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
  </svg>
);
const LogOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);
const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
    </svg>
);
const ClearIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);
const YouTubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="youtube-icon">
    <path d="M21.582,6.186c-0.23-0.854-0.906-1.531-1.76-1.76C18.258,4,12,4,12,4S5.742,4,4.178,4.426 c-0.854,0.23-1.531,0.906-1.76,1.76C2,7.75,2,12,2,12s0,4.25,0.418,5.814c0.23,0.854,0.906,1.531,1.76,1.76 C5.742,20,12,20,12,20s6.258,0,7.822-0.426c0.854-0.23,1.531-0.906,1.76-1.76C22,16.25,22,12,22,12S22,7.75,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z" />
  </svg>
);


const PDFPreview = ({ file, historicalFileName }: { file: File | null, historicalFileName?: string }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfUrl(null);
    }
  }, [file]);

  if (!pdfUrl && !historicalFileName) {
    return (<div className="pdf-preview-placeholder"><p>Upload a PDF to see preview</p></div>);
  }
  if (historicalFileName && !file) {
     return (
        <div className="pdf-preview-placeholder">
            <p>Viewing historical data for: <br /><strong>{historicalFileName}</strong></p>
            <p className="historical-note">Upload this PDF again to enable full interaction (e.g., continue chat, get new quiz feedback).</p>
        </div>
    );
  }

  return (
    <div className="pdf-preview-container">
      <h3>PDF Preview</h3>
      <div className="pdf-viewer"><iframe src={pdfUrl!} width="100%" height="100%" title="PDF Preview" /></div>
    </div>
  );
};

interface ChatMessage {
  role: 'user' | 'model' | 'system_error';
  text: string;
  id: string;
}

interface QuizQuestion {
  question: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  options?: string[];
  answer: string;
  userSelectedOption?: string | null;
  isAttempted?: boolean;
  showShortAnswer?: boolean;
}

interface ReadingSuggestion {
  title: string;
  url: string;
  type?: 'article' | 'video'; // Added type to distinguish content
}

interface CurrentUser {
  id: string;
  username: string; 
}

interface UserDashboardData {
  uploads: Array<{ id: string; fileName: string; uploadTimestamp: string; analysisRecord?: any /* Store full analysis here */ }>;
  quizzes: Array<{ id: string; pdfFileName: string; score: number; quizTimestamp: string }>;
  chats: Array<{ id: string; pdfFileName: string; lastActivity: string; history: ChatMessage[] }>;
}


function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("authToken"));
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const [userDashboardData, setUserDashboardData] = useState<UserDashboardData | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isViewingHistorical, setIsViewingHistorical] = useState(false);


  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState("")
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0].value)

  const [simplifiedExplanation, setSimplifiedExplanation] = useState(false)
  const [pageByPageExplanation, setPageByPageExplanation] = useState(false);
  const [pageNumbers, setPageNumbers] = useState("");
  const [explainWithAnalogy, setExplainWithAnalogy] = useState(false);
  const [analogyTopic, setAnalogyTopic] = useState("");
  const [glossaryBuilder, setGlossaryBuilder] = useState(false)
  const [quizGenerator, setQuizGenerator] = useState(false)
  const [numQuestions, setNumQuestions] = useState<number>(3)
  const [multilingualMode, setMultilingualMode] = useState(false)
  const [language, setLanguage] = useState("")
  const [chatSupport, setChatSupport] = useState(false) 

  const [apiResponse, setApiResponse] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressMessage, setProgressMessage] = useState<string | null>(null)

  const [theme, setTheme] = useState("dark")
  const [processedQuiz, setProcessedQuiz] = useState<QuizQuestion[]>([])
  const [quizFeedbackMessage, setQuizFeedbackMessage] = useState<string | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [allQuestionsAnswered, setAllQuestionsAnswered] = useState(false);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentFollowUp, setCurrentFollowUp] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const backendBaseUrl = 'https://academic-pdf-companion.onrender.com'; 
  const authBackendUrl = `${backendBaseUrl}/auth`;
  const apiBackendUrl = `${backendBaseUrl}/api`;


  useEffect(() => { document.documentElement.setAttribute("data-theme", theme) }, [theme])
  const toggleTheme = () => { setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light")) }

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = { ...options.headers, 'Content-Type': 'application/json' };
    const currentToken = localStorage.getItem("authToken"); 
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 && !url.includes('/auth/')) { 
      handleLogout();
      throw new Error("Session expired or invalid. Please log in again.");
    }
    return response;
  }, []); 
  
  const resetAnalysisState = (clearPdf = true) => {
    if (clearPdf) {
        setPdfFile(null);
        setFileName("");
    }
    setApiResponse(null);
    setProcessedQuiz([]);
    setQuizFeedbackMessage(null);
    setAllQuestionsAnswered(false);
    setChatHistory([]);
    setError(null);
    setProgressMessage(null);
    setIsLoading(false);
    setIsChatLoading(false);
    setIsViewingHistorical(false);
    setChatSupport(false); 

    setSimplifiedExplanation(false);
    setPageByPageExplanation(false);
    setPageNumbers("");
    setExplainWithAnalogy(false);
    setAnalogyTopic("");
    setGlossaryBuilder(false);
    setQuizGenerator(false);
    setNumQuestions(3);
    setMultilingualMode(false);
    setLanguage("");
  };


  useEffect(() => {
    const verifyTokenAndFetchUser = async () => {
      const currentToken = localStorage.getItem("authToken");
      if (currentToken) {
        try {
          setIsAuthLoading(true);
          const response = await fetchWithAuth(`${apiBackendUrl}/user/me`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to verify token");
          }
          const userData = await response.json();
          setCurrentUser(userData.user);
        } catch (err: any) {
          console.error("Token verification failed:", err);
          handleLogout(); 
          setAuthError(err.message || "Session invalid. Please login.");
        } finally {
          setIsAuthLoading(false);
        }
      } else {
        setCurrentUser(null);
        setUserDashboardData(null);
        resetAnalysisState(); 
      }
    };
    verifyTokenAndFetchUser();
  }, [token, fetchWithAuth]); 

  const fetchUserDashboardData = useCallback(async () => {
    const currentToken = localStorage.getItem("authToken");
    if (!currentToken || !currentUser) return; 
    setIsDashboardLoading(true);
    setError(null); 
    try {
      const response = await fetchWithAuth(`${apiBackendUrl}/user/dashboard-data`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const data = await response.json();
      setUserDashboardData(data);
    } catch (err: any) {
      setError(`Dashboard error: ${err.message}`); 
    } finally {
      setIsDashboardLoading(false);
    }
  }, [fetchWithAuth, currentUser]); 

  useEffect(() => {
    if (currentUser) { 
        fetchUserDashboardData();
    }
  }, [currentUser, fetchUserDashboardData]);


  const handleAuthSuccess = (newToken: string, user: CurrentUser) => {
    localStorage.setItem("authToken", newToken);
    setToken(newToken); 
    setCurrentUser(user); 
    setAuthError(null);
    setAuthView('login'); 
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const response = await fetch(`${authBackendUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');
      handleAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setAuthError(err.message);
      setCurrentUser(null); 
      localStorage.removeItem("authToken"); 
      setToken(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const response = await fetch(`${authBackendUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Signup failed');
      handleAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setAuthError(err.message);
      setCurrentUser(null);
      localStorage.removeItem("authToken");
      setToken(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      if (!credentialResponse.credential) {
        throw new Error("Google Sign-In failed: No credential received.");
      }
      const response = await fetch(`${authBackendUrl}/google/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }), 
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Google Sign-In verification failed');
      handleAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setAuthError(`Google Sign-In Error: ${err.message}`);
      setCurrentUser(null);
      localStorage.removeItem("authToken");
      setToken(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleLoginError = () => {
    setAuthError("Google Sign-In failed. Please try again.");
    setIsAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    setCurrentUser(null);
    setUserDashboardData(null);
    setShowDashboard(false);
    setAuthError(null); 
    resetAnalysisState(); 
  };


  const exportSummaryAsPDF = () => {
    if (!apiResponse) return
    const pdf = new jsPDF()
    let yPosition = 20
    pdf.setFontSize(20)
    pdf.text("Academic PDF Analysis Summary", 20, yPosition)
    yPosition += 20
    if (fileName) {
      pdf.setFontSize(12)
      pdf.text(`Document: ${fileName}`, 20, yPosition)
      yPosition += 15
    }
    if (apiResponse.explanation) {
      pdf.setFontSize(16); pdf.text("Simplified Explanation", 20, yPosition); yPosition += 10
      pdf.setFontSize(11); const el = pdf.splitTextToSize(apiResponse.explanation, 170); pdf.text(el, 20, yPosition); yPosition += el.length * 5 + 10
    }
    if (apiResponse.pageExplanations && apiResponse.pageExplanations.length > 0) {
      if (yPosition > 230) { pdf.addPage(); yPosition = 20; }
      pdf.setFontSize(16); pdf.text("Page-by-Page Breakdown", 20, yPosition); yPosition += 10;
      apiResponse.pageExplanations.forEach((item: any) => {
        if (yPosition > 250) { pdf.addPage(); yPosition = 20; }
        pdf.setFontSize(12); pdf.setFont(undefined, "bold"); pdf.text(item.page_reference, 20, yPosition); yPosition += 7;
        pdf.setFontSize(11); pdf.setFont(undefined, "normal"); const pel = pdf.splitTextToSize(item.explanation, 170); pdf.text(pel, 20, yPosition); yPosition += pel.length * 5 + 10;
      });
    }
    if (apiResponse.analogyExplanation) {
      if (yPosition > 250) { pdf.addPage(); yPosition = 20; }
      const currentAnalogyTopic = (isViewingHistorical && apiResponse.analogyTopic) ? apiResponse.analogyTopic : analogyTopic;
      pdf.setFontSize(16); pdf.text(`Analogy for "${currentAnalogyTopic || "Selected Topic"}"`, 20, yPosition); yPosition += 10;
      pdf.setFontSize(11); const al = pdf.splitTextToSize(apiResponse.analogyExplanation, 170); pdf.text(al, 20, yPosition); yPosition += al.length * 5 + 10;
    }
    if (apiResponse.glossary && apiResponse.glossary.length > 0) {
      if (yPosition > 250) { pdf.addPage(); yPosition = 20; }
      pdf.setFontSize(16); pdf.text("Glossary", 20, yPosition); yPosition += 10
      pdf.setFontSize(11);
      apiResponse.glossary.forEach((item: any) => {
        if (yPosition > 270) { pdf.addPage(); yPosition = 20; }
        pdf.setFont(undefined, "bold"); pdf.text(`${item.term}:`, 20, yPosition);
        pdf.setFont(undefined, "normal"); const dl = pdf.splitTextToSize(item.definition, 150); pdf.text(dl, 20, yPosition + 5); yPosition += dl.length * 5 + 8
      })
    }
    if (apiResponse.readingSuggestions && apiResponse.readingSuggestions.length > 0) {
      if (yPosition > 250) { pdf.addPage(); yPosition = 20; }
      pdf.setFontSize(16); pdf.text("Reading Suggestions", 20, yPosition); yPosition += 10
      pdf.setFontSize(11);
      apiResponse.readingSuggestions.forEach((suggestion: ReadingSuggestion, index: number) => {
        if (yPosition > 270) { pdf.addPage(); yPosition = 20; }
        const isVideo = suggestion.type === 'video' || (suggestion.url.includes('youtube.com/') || suggestion.url.includes('youtu.be/'));
        const prefix = isVideo ? "[Video] " : "";
        const textToPrint = `${index + 1}. ${prefix}${suggestion.title} (${suggestion.url})`;
        const splitText = pdf.splitTextToSize(textToPrint, 170);
        pdf.text(splitText, 20, yPosition);
        yPosition += splitText.length * 5 + 2; 
      })
    }
    pdf.save(`${fileName.replace(".pdf", "")}_summary.pdf`)
  }
  const exportQuizAsPDF = () => {
    if (!processedQuiz || processedQuiz.length === 0) return
    const pdf = new jsPDF(); let yPosition = 20
    pdf.setFontSize(20); pdf.text("Quiz Sheet", 20, yPosition); yPosition += 20
    if (fileName) { pdf.setFontSize(12); pdf.text(`Document: ${fileName}`, 20, yPosition); yPosition += 15 }
    pdf.setFontSize(12); pdf.text("Instructions: Answer all questions below.", 20, yPosition); yPosition += 20
    processedQuiz.forEach((item, index) => {
      if (yPosition > 250) { pdf.addPage(); yPosition = 20; }
      pdf.setFontSize(12); pdf.setFont(undefined, "bold"); const ql = pdf.splitTextToSize(`Q${index + 1}: ${item.question}`, 170); pdf.text(ql, 20, yPosition); yPosition += ql.length * 6 + 5
      pdf.setFont(undefined, "normal");
      if ((item.type === "multiple_choice" || item.type === "true_false") && item.options) {
        item.options.forEach((option: string, optIndex: number) => {
          if (yPosition > 270) { pdf.addPage(); yPosition = 20; }
          pdf.text(`   ${String.fromCharCode(65 + optIndex)}. ${option}`, 25, yPosition); yPosition += 6
        }); yPosition += 5
      } else if (item.type === "short_answer") {
        pdf.text("   Answer: ________________________________", 25, yPosition); yPosition += 15
      } yPosition += 5
    });
    pdf.save(`${fileName.replace(".pdf", "")}_quiz.pdf`)
  }
  const printQuiz = () => {
    const printContent = `
      <html><head><title>Quiz Sheet</title><style>
      body { font-family: Arial, sans-serif; margin: 20px; } .question { margin-bottom: 20px; }
      .question-text { font-weight: bold; margin-bottom: 10px; } .option { margin-left: 20px; margin-bottom: 5px; }
      .answer-line { margin-left: 20px; border-bottom: 1px solid #000; width: 300px; height: 20px; }
      @media print { body { margin: 0; } } </style></head><body>
      <h1>Quiz Sheet</h1><p><strong>Document:</strong> ${fileName}</p>
      <p><strong>Instructions:</strong> Answer all questions below.</p>
      ${processedQuiz.map((item, index) => `
        <div class="question">
          <div class="question-text">Q${index + 1}: ${item.question}</div>
          ${(item.type === "multiple_choice" || item.type === "true_false") && item.options ? item.options.map((option: string, optIndex: number) =>
              `<div class="option">${String.fromCharCode(65 + optIndex)}. ${option}</div>`).join("")
            : (item.type === "short_answer" ? '<div class="answer-line"></div>' : '')}
        </div>`).join("")}
      </body></html>`;
    const printWindow = window.open("", "_blank");
    if (printWindow) { printWindow.document.write(printContent); printWindow.document.close(); printWindow.print(); }
  }

  useEffect(() => {
    if (apiResponse?.quiz) {
        const initialQuiz = apiResponse.quiz.map((q: any) => ({
            ...q,
            options: q.options || (q.type === "true_false" ? ["True", "False"] : []),
            userSelectedOption: null,
            isAttempted: false,
            showShortAnswer: false
        } as QuizQuestion));
      setProcessedQuiz(initialQuiz);
      setAllQuestionsAnswered(false);
      setQuizFeedbackMessage(null);
    } else if (!isViewingHistorical) { 
      setProcessedQuiz([]);
      setAllQuestionsAnswered(false);
      setQuizFeedbackMessage(null);
    }
  }, [apiResponse, isViewingHistorical])


  const fetchQuizFeedback = useCallback(async () => {
    const currentToken = localStorage.getItem("authToken");
    if (!pdfFile || processedQuiz.length === 0 || !allQuestionsAnswered || !currentToken || isViewingHistorical) return;

    setIsFeedbackLoading(true);
    setError(null);

    const correctAnswers = processedQuiz.filter(q => q.userSelectedOption === q.answer).length;
    const totalQuestions = processedQuiz.length;
    const score = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

    const incorrectQuestions = processedQuiz
      .filter(q => q.isAttempted && q.userSelectedOption !== q.answer)
      .map(q => ({
        question: q.question,
        userAnswer: q.userSelectedOption,
        correctAnswer: q.answer
      }));

    try {
      const base64PdfData = await convertFileToBase64(pdfFile);
      const response = await fetchWithAuth(`${apiBackendUrl}/quiz-feedback`, {
        method: 'POST',
        body: JSON.stringify({
          base64PdfData,
          pdfMimeType: pdfFile.type,
          pdfFileName: fileName, 
          score,
          incorrectQuestions
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error from server" }));
        throw new Error(errorData.error || errorData.message || `Server responded with ${response.status}`);
      }
      const data = await response.json();
      setQuizFeedbackMessage(data.feedback || "No specific feedback provided.");
      fetchUserDashboardData(); 
    } catch (err: any) {
      setError(`Failed to get quiz feedback: ${err.message}`);
      setQuizFeedbackMessage(null);
    } finally {
      setIsFeedbackLoading(false);
    }
  }, [pdfFile, fileName, processedQuiz, allQuestionsAnswered, fetchWithAuth, fetchUserDashboardData, isViewingHistorical]);


  useEffect(() => {
    const currentToken = localStorage.getItem("authToken");
    if (processedQuiz && processedQuiz.length > 0) {
      const allDone = processedQuiz.every(q => q.isAttempted);
      setAllQuestionsAnswered(allDone);
      if (allDone && !quizFeedbackMessage && !isFeedbackLoading && pdfFile && currentToken && !isViewingHistorical) { 
         fetchQuizFeedback();
      }
    } else {
      setAllQuestionsAnswered(false);
    }
  }, [processedQuiz, quizFeedbackMessage, isFeedbackLoading, pdfFile, fetchQuizFeedback, isViewingHistorical]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === "application/pdf") {
        resetAnalysisState(false); 
        setPdfFile(file); 
        setFileName(file.name); 
        setIsViewingHistorical(false); 
      }
      else { 
        resetAnalysisState(true); 
        setError("Please upload a valid PDF file.");
      }
    }
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === "string") { const base64String = reader.result.split(",")[1]; resolve(base64String); }
        else { reject(new Error("Failed to read file as data URL string.")); }
      };
      reader.onerror = (error) => reject(error);
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const currentToken = localStorage.getItem("authToken");
    if (!pdfFile) { setError("Please upload a PDF file."); return; }
    if (!currentToken) { setError("Please log in to analyze documents."); return; }
    if (isViewingHistorical) { setError("Cannot re-analyze historical data directly. Upload the PDF again for a new analysis."); return; }

    resetAnalysisState(false); 
    setIsLoading(true);
    setProgressMessage("Preparing your document...")
    try {
      const base64PdfData = await convertFileToBase64(pdfFile)
      setProgressMessage("Sending to server for analysis...")
      const requestBody = {
        base64PdfData, pdfMimeType: pdfFile.type, pdfFileName: fileName, documentType,
        simplifiedExplanation, pageByPageExplanation, pageNumbers,
        explainWithAnalogy, analogyTopic, glossaryBuilder, quizGenerator,
        numQuestions, multilingualMode, language
      };
      const response = await fetchWithAuth(`${apiBackendUrl}/analyze-pdf`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      setProgressMessage("Processing AI response from server...")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error from server", details: response.statusText, message: "Server error" }));
        throw new Error(errorData.error || errorData.message || `Server responded with ${response.status}: ${errorData.details || response.statusText}`);
      }
      const parsedData = await response.json();
      setApiResponse(parsedData);
      fetchUserDashboardData(); 
    } catch (err: any) {
      console.error("Client-side error or error communicating with backend:", err)
      setError(`An error occurred: ${err.message}. Please ensure the backend server is running and check its logs.`)
      setApiResponse(null)
    } finally {
      setIsLoading(false); setProgressMessage(null);
    }
  }

  const handleSendFollowUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const currentToken = localStorage.getItem("authToken");
    if (!currentFollowUp.trim()) return;
    
    if (!pdfFile && !(isViewingHistorical && fileName)) {
        setError("Please upload a PDF or load a historical chat to interact.");
        setChatHistory(prev => [...prev, {role: 'system_error', text: "Cannot send message: No PDF context.", id: Date.now().toString() + '_error'}]);
        return;
    }
    if (!pdfFile && isViewingHistorical && fileName) {
        setError("To continue this chat, please upload the PDF: " + fileName);
        setChatHistory(prev => [...prev, {role: 'system_error', text: "Cannot send message: PDF not uploaded for this historical chat.", id: Date.now().toString() + '_error'}]);
        return;
    }
    if (!currentToken) {
        setError("Please log in to use the chat feature.");
        setChatHistory(prev => [...prev, {role: 'system_error', text: "Authentication error. Please log in.", id: Date.now().toString() + '_error'}]);
        return;
    }
    
    const newUserMessageId = Date.now().toString() + '_user_followup';
    const newUserMessage: ChatMessage = { role: 'user', text: currentFollowUp, id: newUserMessageId };
    
    const priorChatHistoryForBackend = chatHistory.filter(msg => msg.role === 'user' || msg.role === 'model');

    setChatHistory(prev => [...prev, newUserMessage]); 
    const messageTextToSend = currentFollowUp; 
    setCurrentFollowUp("");
    setIsChatLoading(true);
    setError(null); 

    try {
      if (!pdfFile) { 
          throw new Error("PDF file is missing for chat context.");
      }
      const base64PdfData = await convertFileToBase64(pdfFile);
      const requestBody = {
        base64PdfData,
        pdfMimeType: pdfFile.type,
        pdfFileName: fileName, 
        priorChatHistory: priorChatHistoryForBackend, 
        newMessageText: messageTextToSend,
        newUserMessageId: newUserMessageId, 
      };

      const response = await fetchWithAuth(`${apiBackendUrl}/follow-up-chat`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorDetail = `Server responded with ${response.status}`;
        try {
            const errorData = await response.json();
            errorDetail = errorData.error || errorData.message || errorData.details || errorDetail;
        } catch (jsonParseError) {
            const textError = await response.text();
            errorDetail = `Chat Error (${response.status}): ${textError.substring(0, 150)}${textError.length > 150 ? '...' : ''}`;
            console.error("Non-JSON error response from follow-up chat:", textError);
        }
        throw new Error(errorDetail);
      }

      const data = await response.json();
      if (data.chatResponse && data.modelMessageId) {
        setChatHistory(prev => [...prev, { role: 'model', text: data.chatResponse, id: data.modelMessageId }]);
        fetchUserDashboardData(); 
      } else {
        throw new Error("Incomplete follow-up data from server (missing response or ID).");
      }

    } catch (err: any) {
      console.error("Error sending follow-up chat:", err);
      const errorMessage = err.message || "An unknown error occurred during chat.";
      setChatHistory(prev => [...prev, {role: 'system_error', text: `Error: ${errorMessage}`, id: Date.now().toString() + '_error_followup'}]);
      setError(errorMessage); 
    } finally {
      setIsChatLoading(false);
    }
  };


  const handleLoadAnalysis = async (analysisId: string, analysisFileName: string) => {
    const currentToken = localStorage.getItem("authToken");
    if (!currentToken) { setError("Please log in."); return; }
    
    resetAnalysisState(); 
    setIsLoading(true);
    setProgressMessage(`Loading historical analysis for ${analysisFileName}...`);
    setIsViewingHistorical(true);
    setFileName(analysisFileName); 

    try {
        const response = await fetchWithAuth(`${apiBackendUrl}/user/analysis/${analysisId}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Failed to load analysis."}));
            throw new Error(errorData.message || `Server error: ${response.status}`);
        }
        const data = await response.json();
        setApiResponse(data.analysisRecord); 
        
        if (data.analysisRecord?.chatAnswer && data.analysisRecord?.initialQuestion) { 
            setChatHistory([
                { role: 'user', text: data.analysisRecord.initialQuestion, id: Date.now().toString() + '_hist_user' },
                { role: 'model', text: data.analysisRecord.chatAnswer, id: Date.now().toString() + '_hist_model' }
            ]);
             setChatSupport(true); 
        } else if (data.analysisRecord?.requestOptions?.chatSupport) {
             setChatSupport(true); 
        }
        
        if (data.analysisRecord?.requestOptions?.analogyTopic) setAnalogyTopic(data.analysisRecord.requestOptions.analogyTopic);
        else if (data.analysisRecord?.analogyTopic) setAnalogyTopic(data.analysisRecord.analogyTopic)

        if (data.analysisRecord?.requestOptions?.language) setLanguage(data.analysisRecord.requestOptions.language);
        else if (data.analysisRecord?.language) setLanguage(data.analysisRecord.language);
        
        if (data.analysisRecord?.requestOptions) {
            setSimplifiedExplanation(data.analysisRecord.requestOptions.simplifiedExplanation || false);
            setPageByPageExplanation(data.analysisRecord.requestOptions.pageByPageExplanation || false);
            setPageNumbers(data.analysisRecord.requestOptions.pageNumbers || "");
            setExplainWithAnalogy(data.analysisRecord.requestOptions.explainWithAnalogy || false);
            setGlossaryBuilder(data.analysisRecord.requestOptions.glossaryBuilder || false);
            setQuizGenerator(data.analysisRecord.requestOptions.quizGenerator || false);
            setNumQuestions(data.analysisRecord.requestOptions.numQuestions || 3);
            setMultilingualMode(data.analysisRecord.requestOptions.multilingualMode || false);
        }


    } catch (err: any) {
        setError(`Failed to load analysis: ${err.message}`);
        resetAnalysisState(); 
    } finally {
        setIsLoading(false);
        setProgressMessage(null);
        setShowDashboard(false); 
    }
  };

  const handleLoadChat = async (chatId: string, chatPdfFileName: string) => {
    const currentToken = localStorage.getItem("authToken");
    if (!currentToken) { setError("Please log in."); return; }

    resetAnalysisState(); 
    setIsLoading(true); 
    setProgressMessage(`Loading chat for ${chatPdfFileName}...`);
    setIsViewingHistorical(true);
    setFileName(chatPdfFileName); 

    try {
        const response = await fetchWithAuth(`${apiBackendUrl}/user/chat/${chatId}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Failed to load chat."}));
            throw new Error(errorData.message || `Server error: ${response.status}`);
        }
        const data = await response.json();
        setChatHistory(data.history || []);
        setChatSupport(true); 
    } catch (err: any) {
        setError(`Failed to load chat: ${err.message}`);
        resetAnalysisState(); 
    } finally {
        setIsLoading(false);
        setProgressMessage(null);
        setShowDashboard(false); 
    }
  };

  const handleClearHistoricalView = () => {
    resetAnalysisState(true); 
  };


  const handleQuizOptionSelect = (quizIndex: number, option: string) => {
    setProcessedQuiz((prevQuiz) =>
      prevQuiz.map((q, idx) =>
        idx === quizIndex ? { ...q, userSelectedOption: option, isAttempted: true } : q
      )
    );
  };

  const toggleShortAnswer = (quizIndex: number) => {
    setProcessedQuiz((prevQuiz) =>
      prevQuiz.map((q, idx) =>
        idx === quizIndex ? { ...q, showShortAnswer: !q.showShortAnswer, isAttempted: true } : q
      )
    );
  };

  if (isAuthLoading && !currentUser && !token) { 
    return (
      <div className="app-container">
        <header className="app-header"><h1>Academic PDF Companion</h1></header>
        <div className="loading-message card" aria-live="polite">
          <div className="spinner"></div>
          <p>Initializing...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div className="app-container">
          <header className="app-header">
            <h1>Academic PDF Companion</h1>
            <div className="header-controls">
              <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
                {theme === "light" ? <MoonIcon /> : <SunIcon />}
              </button>
            </div>
          </header>
          <div className="auth-container card">
            <div className="auth-tabs">
              <button onClick={() => setAuthView('login')} className={authView === 'login' ? 'active' : ''}>Login</button>
              <button onClick={() => setAuthView('signup')} className={authView === 'signup' ? 'active' : ''}>Sign Up</button>
            </div>
            {authError && <p className="error-message" role="alert">{authError}</p>}
            {authView === 'login' ? (
              <form onSubmit={handleLogin} className="auth-form">
                <h2>Login</h2>
                <div className="form-group">
                  <label htmlFor="login-username">Username</label>
                  <input type="text" id="login-username" name="username" required />
                </div>
                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <input type="password" id="login-password" name="password" required />
                </div>
                <button type="submit" className="submit-button" disabled={isAuthLoading}>
                  {isAuthLoading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="auth-form">
                <h2>Sign Up</h2>
                <div className="form-group">
                  <label htmlFor="signup-username">Username</label>
                  <input type="text" id="signup-username" name="username" required />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-password">Password</label>
                  <input type="password" id="signup-password" name="password" required />
                </div>
                <button type="submit" className="submit-button" disabled={isAuthLoading}>
                  {isAuthLoading ? 'Signing up...' : 'Sign Up'}
                </button>
              </form>
            )}
            <div className="google-signin-container">
              <p className="or-divider"><span>OR</span></p>
              <GoogleLogin
                onSuccess={handleGoogleLoginSuccess}
                onError={handleGoogleLoginError}
                theme={theme === "dark" ? "filled_black" : "outline"}
                shape="rectangular"
                logo_alignment="left"
              />
            </div>
          </div>
          <footer className="app-footer">
            <h3>Incorporates generative capabilities through Google's Gemini API.</h3>
            <a href="https://vineethummadisettyportfolio.vercel.app/">Vineeth Ummadisetty</a>
          </footer>
        </div>
      </GoogleOAuthProvider>
    );
  }


  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Academic PDF Companion</h1>
        <div className="header-controls">
          <span className="user-greeting">Welcome, {currentUser.username}!</span>
          <button onClick={() => {setShowDashboard(!showDashboard); if(showDashboard) setError(null); else fetchUserDashboardData(); }} className="dashboard-toggle" aria-label="Toggle dashboard" aria-expanded={showDashboard}>
            <UserIcon /> {showDashboard ? 'Hide Dashboard' : 'My Dashboard'}
          </button>
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
          <button onClick={handleLogout} className="logout-button" aria-label="Logout">
            <LogOutIcon /> Logout
          </button>
        </div>
      </header>

      {showDashboard && (
        <section className="user-dashboard card" aria-labelledby="dashboard-heading">
          <h2 id="dashboard-heading">My Dashboard</h2>
          {isDashboardLoading && <div className="loading-message small-loading"><div className="spinner small-spinner"></div> <p>Loading dashboard...</p></div>}
          {userDashboardData && !isDashboardLoading && (
            <div className="dashboard-columns">
              <div className="dashboard-column">
                <h3>My Uploads</h3>
                {userDashboardData.uploads?.length > 0 ? (
                  <ul>{userDashboardData.uploads.map(up => (
                    <li key={up.id}>
                        <button onClick={() => handleLoadAnalysis(up.id, up.fileName)} className="dashboard-item-button">
                            {up.fileName} ({new Date(up.uploadTimestamp).toLocaleDateString()})
                        </button>
                    </li>))}
                  </ul>
                ) : <p>No uploads yet.</p>}
              </div>
              <div className="dashboard-column">
                <h3>My Quizzes</h3>
                 {userDashboardData.quizzes?.length > 0 ? (
                  <ul>{userDashboardData.quizzes.map(q => (
                    <li key={q.id}>
                        {q.pdfFileName} - Score: {q.score * 100}% ({new Date(q.quizTimestamp).toLocaleDateString()})
                    </li>))}
                  </ul>
                ) : <p>No quizzes taken yet.</p>}
              </div>
              <div className="dashboard-column">
                <h3>My Chats</h3>
                {userDashboardData.chats?.length > 0 ? (
                  <ul>{userDashboardData.chats.map(c => (
                    <li key={c.id}>
                        <button onClick={() => handleLoadChat(c.id, c.pdfFileName)} className="dashboard-item-button">
                           {c.pdfFileName} ({c.history?.length || 0} msgs, {new Date(c.lastActivity).toLocaleDateString()})
                        </button>
                    </li>))}
                  </ul>
                ) : <p>No chat sessions yet.</p>}
              </div>
            </div>
          )}
          {!userDashboardData && !isDashboardLoading && !error && <p>No data available.</p>}
           {error && !isDashboardLoading && <p className="error-message card" role="alert">{error}</p>}
        </section>
      )}

      {!showDashboard && (
        <>
          {isViewingHistorical && (
              <div className="historical-view-banner card">
                  <p><HistoryIcon /> You are viewing historical data for: <strong>{fileName}</strong>.</p>
                  <p>Full interaction (new analysis, continued chat, quiz feedback) requires the PDF to be uploaded again.</p>
                  <button onClick={handleClearHistoricalView} className="clear-view-button">
                      <ClearIcon /> Clear and Start New Analysis
                  </button>
              </div>
          )}
          <div className="main-content">
            <div className="left-panel">
              <form onSubmit={handleSubmit} className="form-section card" aria-labelledby="form-heading">
                <h2 id="form-heading" className="sr-only">Analysis Configuration</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="pdf-upload">Upload PDF Document</label>
                    <input type="file" id="pdf-upload" accept=".pdf" onChange={handleFileChange} aria-describedby={fileName ? "file-name-desc" : undefined} required={!isViewingHistorical} />
                    {fileName && (<p id="file-name-desc" className="file-name">Selected: {fileName}</p>)}
                  </div>
                  <div className="form-group">
                    <label htmlFor="document-type">Document Type</label>
                    <select id="document-type" value={documentType} onChange={(e) => setDocumentType(e.target.value)} disabled={isViewingHistorical}>
                      {DOCUMENT_TYPES.map((docType) => (<option key={docType.value} value={docType.value}>{docType.label}</option>))}
                    </select>
                  </div>
                </div>
                <fieldset className="form-group">
                  <legend>Optional Features</legend>
                  <div className="checkbox-options-grid">
                    <div className="checkbox-group">
                      <input type="checkbox" id="simplified-explanation" checked={simplifiedExplanation} onChange={(e) => setSimplifiedExplanation(e.target.checked)} disabled={isViewingHistorical}/>
                      <label htmlFor="simplified-explanation">Simplified Explanation</label>
                    </div>
                    <div className="checkbox-group">
                      <input type="checkbox" id="page-by-page-explanation" checked={pageByPageExplanation} onChange={(e) => setPageByPageExplanation(e.target.checked)} disabled={isViewingHistorical}/>
                      <label htmlFor="page-by-page-explanation">Page-by-Page Explanation</label>
                    </div>
                    {pageByPageExplanation && (
                      <div className="form-group indented-group">
                        <label htmlFor="page-numbers">Page Numbers / Sections (e.g., 1, 3-5, Intro):</label>
                        <input type="text" id="page-numbers" value={pageNumbers} onChange={(e) => setPageNumbers(e.target.value)} placeholder="e.g., 1-2, 5, Conclusion" disabled={isViewingHistorical}/>
                      </div>
                    )}
                    <div className="checkbox-group">
                      <input type="checkbox" id="explain-with-analogy" checked={explainWithAnalogy} onChange={(e) => setExplainWithAnalogy(e.target.checked)} disabled={isViewingHistorical}/>
                      <label htmlFor="explain-with-analogy">Explain with Analogy</label>
                    </div>
                    {explainWithAnalogy && (
                      <div className="form-group indented-group">
                        <label htmlFor="analogy-topic">Topic for Analogy:</label>
                        <input type="text" id="analogy-topic" value={analogyTopic} onChange={(e) => setAnalogyTopic(e.target.value)} placeholder="Enter topic from PDF" disabled={isViewingHistorical}/>
                      </div>
                    )}
                    <div className="checkbox-group">
                      <input type="checkbox" id="glossary-builder" checked={glossaryBuilder} onChange={(e) => setGlossaryBuilder(e.target.checked)} disabled={isViewingHistorical}/>
                      <label htmlFor="glossary-builder">Glossary Builder</label>
                    </div>
                    <div className="checkbox-group">
                      <input type="checkbox" id="quiz-generator" checked={quizGenerator} onChange={(e) => setQuizGenerator(e.target.checked)} disabled={isViewingHistorical}/>
                      <label htmlFor="quiz-generator">Quiz Generator</label>
                    </div>
                    {quizGenerator && (
                      <div className="form-group indented-group">
                        <label htmlFor="num-questions">Number of Questions:</label>
                        <input type="number" id="num-questions" value={numQuestions} onChange={(e) => setNumQuestions(Number.parseInt(e.target.value, 10) || 1)} min="1" max="10" disabled={isViewingHistorical}/>
                      </div>
                    )}
                    <div className="checkbox-group">
                      <input type="checkbox" id="multilingual-mode" checked={multilingualMode} onChange={(e) => setMultilingualMode(e.target.checked)} disabled={isViewingHistorical}/>
                      <label htmlFor="multilingual-mode">Multilingual Mode</label>
                    </div>
                    {multilingualMode && (
                      <div className="form-group indented-group">
                        <label htmlFor="language">Target Language:</label>
                        <input type="text" id="language" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g., Spanish, French" disabled={isViewingHistorical}/>
                      </div>
                    )}
                  </div>
                </fieldset>
                <button type="submit" className="submit-button" disabled={isLoading || !pdfFile || isViewingHistorical}>
                  {isLoading ? "Analyzing..." : "Analyze PDF"}
                </button>
              </form>

              {apiResponse && !isLoading && (
                <div className="export-controls card">
                  <h3>Export Options</h3>
                  <div className="export-buttons">
                    {(apiResponse.explanation || apiResponse.glossary || apiResponse.pageExplanations || apiResponse.analogyExplanation) && (
                      <button onClick={exportSummaryAsPDF} className="export-button"><DownloadIcon />Export Summary as PDF</button>
                    )}
                    {processedQuiz.length > 0 && (
                      <><button onClick={exportQuizAsPDF} className="export-button"><DownloadIcon />Export Quiz as PDF</button>
                       <button onClick={printQuiz} className="export-button"><PrintIcon />Print Quiz Sheet</button></>
                    )}
                  </div>
                </div>
              )}

              {apiResponse && !isLoading && !isViewingHistorical && (pdfFile || fileName) && (
                <div className="card chat-controls-section">
                  <h3>Interactive Chat</h3>
                  <button 
                    onClick={() => setChatSupport(prev => !prev)} 
                    className="control-button full-width-button"
                    aria-pressed={chatSupport}
                  >
                    {chatSupport ? "Disable Chat" : "Enable Chat"}
                  </button>
                </div>
              )}

            </div>
            <div className="right-panel">
              <PDFPreview file={pdfFile} historicalFileName={isViewingHistorical ? fileName : undefined} />
            </div>
          </div>

          {isLoading && (<div className="loading-message card" aria-live="polite"><div className="spinner"></div><p>{progressMessage || "Processing..."}</p></div>)}
          {error && !isChatLoading && !showDashboard && (<p className="error-message card" role="alert">{error}</p>)}


          {(apiResponse || (isViewingHistorical && chatHistory.length > 0)) && !isLoading && (
            <section className="response-section" aria-labelledby="response-heading">
              <h2 id="response-heading" className="sr-only">Analysis Results</h2>
              {apiResponse?.explanation && (<article className="card"><h3>Simplified Explanation</h3><p>{apiResponse.explanation}</p></article>)}
              {apiResponse?.pageExplanations && apiResponse.pageExplanations.length > 0 && (
                <article className="card"><h3>Page-by-Page Breakdown</h3>
                  {apiResponse.pageExplanations.map((item: { page_reference: string; explanation: string }, index: number) => (
                    <div key={index} className="page-explanation-item"><h4>{item.page_reference}</h4><p>{item.explanation}</p></div>
                  ))}
                </article>
              )}
              {apiResponse?.analogyExplanation && (<article className="card"><h3>Analogy for "{ (isViewingHistorical && apiResponse.analogyTopic) ? apiResponse.analogyTopic : analogyTopic || "Selected Topic"}"</h3><p>{apiResponse.analogyExplanation}</p></article>)}
              {apiResponse?.translatedText && (<article className="card"><h3>Translated Text ({ (isViewingHistorical && apiResponse.language) ? apiResponse.language : language || "Selected Language"})</h3><p>{apiResponse.translatedText}</p></article>)}
              {apiResponse?.glossary && apiResponse.glossary.length > 0 && (
                <article className="card"><h3>Glossary</h3><ul className="glossary-list">
                    {apiResponse.glossary.map((item: { term: string; definition: string }, index: number) => (
                      <li key={index} className="glossary-item"><strong>{item.term}:</strong> {item.definition}</li>
                    ))}</ul></article>
              )}
              {processedQuiz && processedQuiz.length > 0 && (
                <article className="card quiz-section"><h3>Quiz</h3>
                  {processedQuiz.map((item, index) => (
                    <div key={index} className="quiz-item">
                      <p className="quiz-question"><strong>Q{index + 1}:</strong> {item.question}</p>
                      {(item.type === "multiple_choice" || item.type === "true_false") && item.options && item.options.length > 0 && (
                        <div className="quiz-options">
                          {item.options.map((option: string, optIndex: number) => {
                            const isSelected = item.userSelectedOption === option;
                            const isCorrect = option === item.answer;
                            let buttonClass = "quiz-option-button";
                            if (item.isAttempted) {
                               if (isSelected && isCorrect) buttonClass += " correct selected";
                               else if (isSelected && !isCorrect) buttonClass += " incorrect selected";
                               else if (!isSelected && isCorrect) buttonClass += " correct"; 
                               else buttonClass += " disabled"; 
                            }
                            return (
                                <button
                                    key={optIndex}
                                    className={buttonClass}
                                    onClick={() => !item.isAttempted && !isViewingHistorical && handleQuizOptionSelect(index, option)}
                                    disabled={item.isAttempted || isViewingHistorical}
                                    aria-pressed={isSelected}
                                    aria-describedby={item.isAttempted && isCorrect ? `correct-answer-desc-${index}-${optIndex}`: undefined}
                                >
                                    {option}
                                    {item.isAttempted && isSelected && isCorrect && <span id={`correct-answer-desc-${index}-${optIndex}`} className="sr-only">(Your correct answer)</span>}
                                    {item.isAttempted && !isSelected && isCorrect && <span id={`correct-answer-desc-${index}-${optIndex}`} className="sr-only">(Correct Answer)</span>}
                                    {item.isAttempted && isSelected && !isCorrect && <span className="sr-only">(Your incorrect answer)</span>}
                                </button>
                            );
                          })}
                        </div>
                      )}
                      {item.type === "short_answer" && (
                        <div className="short-answer-container">
                          <button onClick={() => !isViewingHistorical && toggleShortAnswer(index)} className="quiz-option-button" disabled={item.showShortAnswer || isViewingHistorical} aria-expanded={item.showShortAnswer} aria-controls={`short-answer-${index}`}>
                            {item.showShortAnswer ? "Answer Revealed" : "Show Answer"}
                          </button>
                          {item.showShortAnswer && (<p id={`short-answer-${index}`} className="quiz-answer"><strong>Answer:</strong> {item.answer}</p>)}
                        </div>
                      )}
                      {item.isAttempted && item.userSelectedOption !== item.answer && (item.type === "multiple_choice" || item.type === "true_false") && (
                        <p className="quiz-feedback">Correct answer: {item.answer}</p>
                      )}
                    </div>
                  ))}
                  {isFeedbackLoading && (
                    <div className="loading-message small-loading" aria-live="polite">
                      <div className="spinner small-spinner"></div>
                      <p>Generating feedback...</p>
                    </div>
                  )}
                  {allQuestionsAnswered && quizFeedbackMessage && !isFeedbackLoading && !isViewingHistorical && (
                    <div className="quiz-overall-feedback card">
                      <h4>Quiz Feedback</h4>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{quizFeedbackMessage}</p>
                    </div>
                  )}
                   {allQuestionsAnswered && error && !isFeedbackLoading && !quizFeedbackMessage && ( 
                     <p className="error-message card" role="alert">{error}</p>
                   )}
                </article>
              )}
               { chatSupport && (pdfFile || (isViewingHistorical && fileName)) && (
                <article className="card chat-feature-card">
                  <h3>Interactive Chat {isViewingHistorical && fileName ? `(for ${fileName})` : ""}</h3>
                  <div className="chat-container" ref={chatContainerRef}>
                    {chatHistory.map((msg) => (
                      <div key={msg.id} className={`chat-message ${msg.role}-message`}>
                         {msg.role === 'system_error' ? <span className="error-text">{msg.text}</span> : <p>{msg.text}</p>}
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="chat-message model-message chat-loading-indicator">
                        <div className="spinner small-spinner"></div> Thinking...
                      </div>
                    )}
                  </div>
                  <form onSubmit={handleSendFollowUp} className="follow-up-form">
                    <input
                      type="text"
                      value={currentFollowUp}
                      onChange={(e) => setCurrentFollowUp(e.target.value)}
                      placeholder={pdfFile || (isViewingHistorical && fileName) ? "Ask a follow-up question..." : "Upload a PDF to start chatting"}
                      aria-label="Follow-up question"
                      disabled={isChatLoading || (!pdfFile && !(isViewingHistorical && fileName))}
                    />
                    <button type="submit" className="send-follow-up-button" disabled={isChatLoading || !currentFollowUp.trim() || (!pdfFile && !(isViewingHistorical && fileName))}>
                      <SendIcon />
                    </button>
                  </form>
                   {error && isChatLoading && (<p className="error-message chat-error" role="alert">{error}</p>)}
                   {error && !isChatLoading && error.toLowerCase().includes("chat") && (<p className="error-message chat-error" role="alert">{error}</p>)}
                </article>
              )}
              {apiResponse?.chatAnswer && !chatSupport && apiResponse?.initialQuestion && ( 
                <article className="card">
                  <h3>Chat Response (from initial analysis)</h3>
                  <p><strong>Your question:</strong> {apiResponse.initialQuestion}</p>
                  <p><strong>Answer:</strong> {apiResponse.chatAnswer}</p>
                </article>
              )}
              {apiResponse?.readingSuggestions && apiResponse.readingSuggestions.length > 0 && (
                <article className="card"><h3>Reading Suggestions</h3><ul className="reading-suggestions-list">
                    {apiResponse.readingSuggestions.map((suggestion: ReadingSuggestion, index: number) => {
                      const isVideo = suggestion.type === 'video' || (suggestion.url.includes('youtube.com/') || suggestion.url.includes('youtu.be/'));
                      return (
                        <li key={index}>
                          {isVideo ? <YouTubeIcon /> : <span className="list-bullet-arrow">→</span>}
                          <a href={suggestion.url} target="_blank" rel="noopener noreferrer">
                            {suggestion.title}
                          </a>
                        </li>
                      );
                    })}</ul></article>
              )}
            </section>
          )}
        </>
      )}
      <footer className="app-footer">
        <h3>Incorporates generative capabilities through Google's Gemini API.</h3>
        <a href="https://vineethummadisettyportfolio.vercel.app/">Vineeth Ummadisetty</a>
      </footer>
    </div>
  )
}

const rootElement = document.getElementById("root")
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Root element not found")
}
