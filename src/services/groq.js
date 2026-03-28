const GROQ_BASE = "https://api.groq.com/openai/v1";

/**
 * Transcribe audio blob using Groq Whisper large-v3
 * @param {Blob} audioBlob
 * @param {string} apiKey
 * @param {string} languageCode - BCP-47 language code e.g. "hi", "en", "zh"
 */
export async function transcribeAudio(audioBlob, apiKey, languageCode = "hi") {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-large-v3");
  formData.append("language", languageCode);
  formData.append("response_format", "text");

  const response = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Whisper API error: ${err.error?.message || response.statusText}`);
  }

  const text = await response.text();
  return text.trim();
}

/**
 * Extract clinical entities from transcript using Groq Qwen3-32B
 * @param {string} transcript
 * @param {string} apiKey
 * @param {string} languageLabel - Human-readable language name e.g. "Hindi", "French"
 */
export async function extractClinicalEntities(transcript, apiKey, languageLabel = "Hindi") {
  const systemPrompt = `You are a clinical NLP expert. Extract structured medical information from doctor-patient conversations spoken in ${languageLabel}.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation, no <think> tags):
{
  "chief_complaint": "string - main reason for visit",
  "symptoms": ["array of symptoms mentioned"],
  "duration": "string - how long symptoms have been present",
  "vitals": {
    "BP": "if mentioned",
    "Temperature": "if mentioned", 
    "SpO2": "if mentioned",
    "Pulse": "if mentioned",
    "Weight": "if mentioned"
  },
  "diagnosis": ["array of diagnoses or impressions"],
  "medications": ["array of prescribed medications with dose and frequency if mentioned"],
  "lab_orders": ["array of ordered tests"],
  "follow_up": "string - follow up instructions",
  "patient_name": "if mentioned",
  "patient_age": "if mentioned",
  "patient_gender": "if mentioned"
}

Remove any keys with empty arrays or null values. Translate all terms to English. Be concise.`;

  const response = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen/qwen3-32b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract clinical entities from this transcript:\n\n${transcript}` },
      ],
      max_tokens: 1500,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Qwen3 API error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "{}";

  try {
    // Strip <think>...</think> blocks that Qwen3 may emit, then strip markdown fences
    const noThink = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    const clean = noThink.replace(/```json\n?|```\n?/g, "").trim();
    return JSON.parse(clean);
  } catch {
    console.warn("JSON parse failed, returning raw:", content);
    return { chief_complaint: content };
  }
}
