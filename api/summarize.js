import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, modelType } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const modelMap = {
      'fast': 'deepseek/deepseek-r1-distill-llama-70b:free',
    };

    const selectedModel = modelMap[modelType];
    if (!selectedModel) {
      return res.status(400).json({ error: 'Invalid model type' });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000', // Optional but recommended
        'X-Title': 'Your App Name'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at summarizing complex text into concise summaries.'
          },
          {
            role: 'user',
            content: `Summarize the following text:\n\n${text}`
          }
        ],
        max_tokens: 5000,
        temperature: 0.2
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenRouter API Error:', data);
      return res.status(500).json({
        error: 'Failed to generate summary',
        details: data?.error?.message || 'Unknown API error'
      });
    }

    if (data.choices && data.choices.length > 0) {
      return res.status(200).json({ summary: data.choices[0].message.content });
    } else {
      return res.status(500).json({ error: 'No summary generated' });
    }

  } catch (error) {
    console.error('Summary Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
