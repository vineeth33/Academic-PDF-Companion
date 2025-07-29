# Academic PDF Companion

The Academic PDF Companion is a web application designed to help users analyze PDF documents using Google's Gemini API. It offers features like simplified explanations, glossary building, quiz generation, multilingual support, and chat-based Q&A on document content. The application also includes user authentication and a history feature to revisit past analyses.

## Features

- **PDF Upload & Analysis**: Upload PDF documents for AI-powered analysis.
- **Document Type Selection**: Specify the type of document (e.g., research article, textbook chapter) for tailored analysis.
- **AI-Powered Features**:
  - **Simplified Explanation**: Get easy-to-understand summaries of complex topics.
  - **Glossary Builder**: Generate a list of key terms and their definitions from the document.
  - **Quiz Generator**: Create quizzes based on the PDF content, with a configurable number of questions (MCQs and short answers).
  - **Multilingual Mode**: Translate key analysis outputs (like the simplified explanation) into a chosen language.
  - **Chat Support**: Ask specific questions about the document and get AI-generated answers.
- **Structured Response Display**: View AI-generated content in a clean, organized, and card-based UI.
- **User Authentication**: Simple mock login system (username/password) to access features.
- **Analysis History**: Automatically saves the last 5 analyses (inputs and AI responses) for logged-in users, allowing them to revisit previous results.
- **Light/Dark Theme**: Toggle between light and dark UI themes for user comfort.
- **Responsive Design**: Adapts to various screen sizes.

## Tech Stack

- **Frontend**: React (using functional components and hooks)
- **AI Integration**: Google Gemini API (`@google/genai`)
- **JSX Transpilation**: Babel Standalone (for in-browser transpilation of JSX to JavaScript)
- **Styling**: Custom CSS with variables for theming
- **HTTP Client (for Gemini API)**: The `@google/genai` SDK handles this internally.
- **Module Loading**: ES Modules with `esm.sh` for React and Gemini dependencies.

## Setup and Running

### Prerequisites

1.  **Web Browser**: A modern web browser (e.g., Chrome, Firefox, Edge, Safari).
2.  **Google Gemini API Key**:
    - You need a valid API key for the Gemini API.
    - Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to create and obtain your API key.

### Configuration

**Setting up the API Key (Crucial for Local Development)**

This application expects the Gemini API key to be available via `process.env.API_KEY`. Since this is a client-side application using Babel Standalone without a traditional Node.js build environment, you need to manually make this variable available in the browser's context.

1.  Open the `index.html` file.
2.  Before the `<script src="https://unpkg.com/@babel/standalone@^7.24.0/babel.min.js"></script>` line, add the following script block:

    ```html
    <script>
      // WARNING: For local development ONLY. Do NOT deploy with an exposed API key.
      // Replace 'YOUR_GEMINI_API_KEY_HERE' with your actual Gemini API key.
      window.process = {
        env: {
          API_KEY: "YOUR_GEMINI_API_KEY_HERE",
        },
      };
    </script>
    ```

3.  **Replace `'YOUR_GEMINI_API_KEY_HERE'` with your actual Gemini API key.**

    **Security Warning**:

    - This method embeds your API key directly into the client-side code.
    - **This is highly insecure for production environments.** Anyone inspecting your site's code can see your API key.
    - For production, you **must** use a backend proxy to handle API requests and keep your API key secret. This local setup is for demonstration and development purposes only.

### Running the Application

1.  **Clone the repository (if applicable) or ensure all project files are in a single directory.**
2.  **Serve the files using a local HTTP server.**

    - Browsers have security restrictions when opening HTML files directly from the file system (`file:///...`) that can interfere with ES modules and scripts.
    - **Recommended Method**:
      - If you have Node.js installed, you can use `npx serve`:
        ```bash
        cd path/to/your/project-directory
        npx serve
        ```
        Then open the URL provided (usually `http://localhost:3000` or `http://localhost:5000`).
      - Alternatively, use a live server extension in your code editor (e.g., "Live Server" in VS Code). Right-click on `index.html` and choose "Open with Live Server".

3.  **Open the application in your web browser** (e.g., `http://localhost:3000`).

## Usage

1.  **Login**:
    - Upon opening the app, you'll see a login screen.
    - Use the following demo credentials:
      - **Username**: `user`
      - **Password**: `pass`
2.  **PDF Analyzer**:
    - After logging in, you'll be on the "Analyzer" tab.
    - **Upload PDF**: Click the "Choose File" button to select a PDF.
    - **Document Type**: Select the appropriate type for your document.
    - **Optional Features**: Check the boxes for desired features (Simplified Explanation, Glossary, Quiz, etc.). Fill in any additional inputs required (e.g., number of quiz questions, target language).
    - **Analyze**: Click "Analyze PDF". The app will show a loading state while processing.
    - **View Results**: The AI-generated content will appear in structured cards.
3.  **History**:
    - Click the "History" tab in the header.
    - You'll see a list of your last 5 analyses (most recent first).
    - Click on any history item to view its details, including the parameters you used and the full AI response.
    - Click "← Back to History List" to return to the history overview.
4.  **Theme Toggle**:
    - Click the sun/moon icon in the header to switch between light and dark themes.
5.  **Logout**:
    - Click the "Logout" button in the header to return to the login screen.
