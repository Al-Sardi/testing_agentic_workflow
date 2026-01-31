# PDF Summary Emailer

A modern web application that allows users to upload PDF files and receive AI-generated summaries via email.

## Features

- 🤖 **AI-Powered Summarization**: Uses Google Gemini AI to generate intelligent summaries
- ⚡ **Fast Processing**: Quick PDF text extraction and summarization
- 🔒 **Secure**: Files are automatically deleted after processing
- 💎 **Premium UI**: Modern, responsive design with glassmorphism effects
- 📧 **Email Delivery**: Automated email sending with formatted summaries

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- SMTP email account (Gmail, SendGrid, etc.)
- Google AI API key

## Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd /Users/majed/Developer/testing/testing_agentic_workflow
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your credentials:
     ```env
     # Server Configuration
     PORT=3000

     # Email Configuration (SMTP)
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=your-email@gmail.com
     SMTP_PASS=your-app-password
     EMAIL_FROM=your-email@gmail.com

     # AI Configuration
     GOOGLE_AI_API_KEY=your-google-ai-api-key-here

     # File Upload Configuration
     MAX_FILE_SIZE_MB=10
     ```

## Getting API Keys

### Google AI API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your `.env` file

### Gmail SMTP Configuration

If using Gmail:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Select "2-Step Verification"
   - Scroll to "App passwords"
   - Generate a new app password for "Mail"
3. Use this app password in your `.env` file as `SMTP_PASS`

## Running the Application

1. **Start the server**:
   ```bash
   npm start
   ```

2. **Open your browser**:
   - Navigate to `http://localhost:3000`

3. **Use the application**:
   - Enter your name
   - Enter your email address
   - Upload a PDF file (max 10MB)
   - Click "Hochladen & Zusammenfassen"
   - Check your email for the summary

## Project Structure

```
.
├── server.js           # Express server with PDF processing and email logic
├── index.html          # Frontend HTML form
├── style.css           # Premium UI styling
├── script.js           # Client-side form validation and upload handling
├── package.json        # Project dependencies
├── .env.example        # Environment variables template
├── .env                # Your actual environment variables (not in git)
├── .gitignore          # Git ignore file
└── uploads/            # Temporary upload directory (auto-created)
```

## API Endpoints

### `POST /upload`

Upload a PDF file and receive a summary via email.

**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `name` (string): User's name
  - `email` (string): User's email address
  - `pdf` (file): PDF file to summarize

**Response**:
```json
{
  "success": true,
  "message": "PDF processed successfully! Check your email for the summary."
}
```

**Error Response**:
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

### `GET /health`

Health check endpoint.

**Response**:
```json
{
  "status": "OK",
  "timestamp": "2026-01-29T21:44:16.000Z"
}
```

## Troubleshooting

### Email not sending

- Verify SMTP credentials in `.env`
- Check if your email provider allows SMTP access
- For Gmail, ensure you're using an App Password, not your regular password
- Check server logs for detailed error messages

### PDF processing fails

- Ensure the PDF contains extractable text (not just images)
- Check file size is under 10MB
- Verify the file is a valid PDF format

### AI summarization errors

- Verify your Google AI API key is valid
- Check if you have API quota remaining
- Ensure you have internet connectivity

## Security Notes

- Never commit your `.env` file to version control
- Keep your API keys secure
- The application automatically deletes uploaded files after processing
- Consider implementing rate limiting for production use

## License

ISC
