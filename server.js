require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: (process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024 // Default 10MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    }
});

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Configure email transporter with more robust settings for cloud deployment
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    // Use secure true for port 465, false for others (like 587)
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        // Essential for some cloud providers to prevent connection hangs
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 seconds timeout
});

// Extract text from PDF
async function extractTextFromPDF(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

// Summarize text using Google AI with multiple fallback models
async function summarizeText(text) {
    // List of models to try in order of preference
    const modelsToTry = [
        'gemini-2.0-flash-lite', // Efficient, higher limits
        'gemini-flash-latest',   // Standard 1.5 Flash
        'gemini-pro-latest',    // Standard 1.5 Pro
        'gemini-2.0-flash'      // The one currently hitting limits
    ];

    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`Attempting to summarize with model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });

            const prompt = `Please analyze the following document and provide an **optimal, well-structured summary** in HTML format.
            
            **Formatting Requirements:**
            - Use HTML tags (<p>, <strong>, <ul>, <li>) for formatting.
            - **Highlight important keywords and concepts** using <strong> tags.
            - Structure the text into clear, readable **paragraphs**.
            - **DO NOT** include a table of contents or "In this document" lists.
            - **DO NOT** use markdown (like ** or ##), use HTML only.
            - Use bullet points (<ul>/<li>) only for listing key takeaways at the end.
            
            **Content Requirements:**
            - Focus on the core message and most important details.
            - Make it easy to read and engaging.
            - Start directly with the summary, no "Here is the summary" intro.

            Document text:
            ${text.substring(0, 30000)}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let summaryText = response.text();

            // Clean up text if it contains markdown code blocks
            summaryText = summaryText.replace(/```html/g, '').replace(/```/g, '');

            console.log(`Success with model: ${modelName}`);
            return summaryText;

        } catch (error) {
            console.error(`Error with model ${modelName}:`, error.message);
            lastError = error;

            // If it's a 429 (Quota) or 404 (Not Found), try the next model
            if (error.message.includes('429') || error.message.includes('404')) {
                console.log(`Model ${modelName} failed, trying next available model...`);
                continue;
            }

            // For other critical errors, break early
            break;
        }
    }

    // If we get here, all models failed
    console.error('All AI models failed to generate a summary.');

    // Log to file for debugging
    fs.appendFileSync('error.log', new Date().toISOString() + ' - Final AI Error: ' + lastError.message + '\n' + JSON.stringify(lastError, null, 2) + '\n\n');

    // Fallback to simple text extraction if AI fails
    const maxLength = 3000;
    const preview = text.substring(0, maxLength).replace(/\n/g, '<br>');
    return `
        <div style="background-color: #fff3cd; color: #856404; padding: 10px; margin-bottom: 20px; border-radius: 4px; border: 1px solid #ffeeba;">
            <strong>⚠️ Hinweis:</strong> Die KI-Zusammenfassung konnte derzeit nicht erstellt werden (Limit erreicht). Hier ist ein Auszug aus dem Text:
        </div>
        <p>${preview}</p>
        <p>...</p>
    `;
}

// Send email with summary
async function sendEmail(to, name, summary, originalFileName) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: to,
            subject: `PDF Summary: ${originalFileName}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello ${name}!</h2>
          <p style="color: #666;">Thank you for uploading your PDF document. Here is the summary:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #444; margin-top: 0;">Document Summary</h3>
            <p style="color: #555; line-height: 1.6; white-space: pre-wrap;">${summary}</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Original File:</strong> ${originalFileName}
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="color: #999; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        // Return the specific error message to help identify SMTP issues
        throw new Error(`Failed to send email: ${error.message}`);
    }
}

// Main upload endpoint
app.post('/upload', upload.single('pdf'), async (req, res) => {
    try {
        // Validate request
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const { name, email } = req.body;

        if (!name || !email) {
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Name and email are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Invalid email format' });
        }

        console.log(`Processing PDF for ${name} (${email})`);

        // Extract text from PDF
        const pdfText = await extractTextFromPDF(req.file.path);

        if (!pdfText || pdfText.trim().length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'PDF appears to be empty or contains no extractable text' });
        }

        console.log(`Extracted ${pdfText.length} characters from PDF`);

        // Generate summary
        const summary = await summarizeText(pdfText);
        console.log('Summary generated successfully');

        // Send email
        await sendEmail(email, name, summary, req.file.originalname);
        console.log('Email sent successfully');

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: 'PDF processed successfully! Check your email for the summary.',
        });

    } catch (error) {
        console.error('Error processing upload:', error);

        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            error: 'An error occurred while processing your request',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Make sure to configure your .env file with SMTP and API credentials');
});
