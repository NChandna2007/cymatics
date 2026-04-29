require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');        
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));  


app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (!process.env.GROQ_API_KEY) {
  console.error("GROQ API KEY missing in .env");
}

app.post('/analyze', async (req, res) => {
  const { dominantFreq, harmonicCount, amplitude, pattern, durationSecs } = req.body;

  const prompt = `
You are an expert in psychoacoustics, cymatics, and somatic medicine.
Analyze this vocal chant data and return JSON only — no markdown, no explanation.

Audio snapshot:
- Dominant frequency: ${dominantFreq} Hz
- Harmonic count: ${harmonicCount}
- Amplitude (0–140): ${amplitude}
- Detected pattern: ${pattern}
- Duration: ${durationSecs}s

Return this exact JSON shape:
{
  "frequency_name": "...",
  "nervous_system": "...",
  "brainwave": "...",
  "respiratory": "...",
  "resonance_zones": ["...", "..."],
  "caution": "...",
  "practice_suggestion": "..."
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    console.log("FULL API RESPONSE:", data);

    if (!data.choices || !data.choices.length) {
      console.error("Invalid API response:", data);
      throw new Error("Invalid API response");
    }

    let content = data.choices[0].message.content;
    console.log("MODEL OUTPUT:", content);

    content = content.replace(/```json|```/g, '').trim();

    let report;
    try {
      report = JSON.parse(content);
    } catch (parseErr) {
      console.error("JSON PARSE FAILED. Raw content:", content);
      throw new Error("Model did not return valid JSON");
    }

    res.json(report);

  } catch (err) {
    console.error("ERROR IN /analyze:", err);
    res.status(500).json({
      error: 'Analysis failed',
      detail: err.message
    });
  }
});

const PORT = process.env.PORT || 3001;   
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

