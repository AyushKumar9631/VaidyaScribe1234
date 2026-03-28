import { useState } from "react";

const GROQ_BASE = "https://api.groq.com/openai/v1";

export default function TranscriptPanel({ transcript, loading, apiKey, languageCode }) {
  const [translated, setTranslated] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [transError, setTransError] = useState(null);

  // Show translate button only when language is not English
  const isEnglish = !languageCode || languageCode === "en";

  const handleTranslate = async () => {
    setTranslating(true);
    setTransError(null);
    try {
      const response = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen/qwen3-32b",
          messages: [
            {
              role: "system",
              content:
                "You are a medical translator. Translate the following doctor-patient conversation transcript to English. Preserve all medical terms accurately. Return only the translated text, no explanation, no <think> tags.",
            },
            { role: "user", content: transcript },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || response.statusText);
      }

      const data = await response.json();
      let text = data.choices[0]?.message?.content || "";
      // Strip any <think> blocks Qwen3 might emit
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      setTranslated(text);
    } catch (err) {
      setTransError(err.message);
    } finally {
      setTranslating(false);
    }
  };

  const handleReset = () => {
    setTranslated(null);
    setTransError(null);
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="pulse-ring" />
        <p>Transcribing with Whisper large-v3...</p>
      </div>
    );
  }

  const displayText = translated || transcript;
  const words = displayText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="transcript-panel">
      <div className="transcript-meta">
        <span className="transcript-label">
          {translated ? "Translated Transcript (English)" : "Raw Transcript"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="word-count">{words} words</span>
          {!isEnglish && !translated && (
            <button
              className="translate-btn"
              onClick={handleTranslate}
              disabled={translating}
            >
              {translating ? "⏳ Translating..." : "🌐 Translate to English"}
            </button>
          )}
          {translated && (
            <button className="translate-btn translate-btn-reset" onClick={handleReset}>
              ↺ Show Original
            </button>
          )}
        </div>
      </div>

      {transError && (
        <div className="error-box" style={{ marginBottom: "8px" }}>
          ⚠️ Translation failed: {transError}
        </div>
      )}

      <p className="transcript-text">{displayText}</p>

      {translated && (
        <p style={{ fontSize: "11px", color: "var(--text3)", marginTop: "8px" }}>
          * Translation is for reference only and is not saved to the database.
        </p>
      )}
    </div>
  );
}
