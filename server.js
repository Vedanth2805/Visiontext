require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize Gemini for OCR
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash'
});

// OCR Endpoint (using Gemini)
app.post('/api/ocr', async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: 'No image provided' });

        const imageParts = [{
            inlineData: {
                data: image,
                mimeType: 'image/png'
            }
        }];

        const prompt = "Extract all text from this image exactly as it appears. Preserve line breaks, spacing, and original formatting. Do not add any additional text or interpretation.";
        const result = await geminiModel.generateContent([prompt, ...imageParts]);
        const text = (await result.response.text())
            .replace(/```/g, '')
            .trim();

        res.json({ text });

    } catch (error) {
        console.error('OCR Error:', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
});

// AI Summary Endpoint (using DeepSeek models via OpenRouter)
app.post('/api/summarize', async (req, res) => {
    try {
        const { text, modelType } = req.body;
        if (!text) return res.status(400).json({ error: 'No text provided' });

        // Determine model based on request
        const modelMap = {
            'fast': 'deepseek/deepseek-r1-distill-llama-70b:free',  // Distilled version
        };

        const selectedModel = modelMap[modelType];
        if (!selectedModel) return res.status(400).json({ error: 'Invalid model type' });

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'YOUR_SITE_URL',  // Optional but recommended
                'X-Title': 'Your App Name'        // Optional but recommended
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [
                    {
                        role: "system",
                        content: `You are an expert at summarizing complex information in multiple languages. Always detect the user's input language automatically and respond in the exact same language without switching to another language. Provide clear, concise, and well-structured summaries using markdown formatting. Preserve all key technical details and important nuances. Limit the entire summary within 5000 tokens. Do not add unnecessary explanations or translations.`
                    },
                    {
                        role: "user",
                        content: `Please create a comprehensive summary of the following text. Use the same language as the input text, preserving all technical details. The summary should be clear, concise, and formatted with markdown. Limit the response to 5000 tokens.\n\n${text}`
                    }
                ],
                max_tokens: 5000,
                temperature: 0.2  // Lower temperature for more factual responses
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('OpenRouter Error:', data);
            return res.status(500).json({ 
                error: 'Failed to generate summary',
                details: data.error?.message || 'Unknown API error'
            });
        }

        if (data.choices && data.choices.length > 0) {
            return res.json({ summary: data.choices[0].message.content });
        } else {
            return res.status(500).json({ error: 'No summary generated' });
        }

    } catch (error) {
        console.error('Summary Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});