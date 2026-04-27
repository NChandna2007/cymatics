require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500'] })); // your frontend's origin
app.use(express.json());


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
 console.log(" FULL API RESPONSE:", data);

    // ✅ VALIDATE RESPONSE
    if (!data.choices || !data.choices.length) {
      console.error(" Invalid API response:", data);
      throw new Error("Invalid API response");
    }

    // ✅ EXTRACT MODEL OUTPUT
    let content = data.choices[0].message.content;

    console.log(" MODEL OUTPUT:", content);

    //  CLEAN MARKDOWN (if present)
    content = content.replace(/```json|```/g, '').trim();

    //  SAFE PARSE
    let report;
    try {
      report = JSON.parse(content);
    } catch (parseErr) {
      console.error(" JSON PARSE FAILED. Raw content:", content);
      throw new Error("Model did not return valid JSON");
    }

    res.json(report);

  } catch (err) {
    // ✅ ADD THIS (YOU WERE MISSING THIS)
    console.error("ERROR IN /analyze:", err);

    res.status(500).json({
      error: 'Analysis failed',
      detail: err.message
    });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});