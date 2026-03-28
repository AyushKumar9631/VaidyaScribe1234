export default function TranscriptPanel({ transcript, loading }) {
  if (loading) {
    return (
      <div className="loading-state">
        <div className="pulse-ring" />
        <p>Transcribing with Whisper large-v3...</p>
      </div>
    );
  }

  const words = transcript.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="transcript-panel">
      <div className="transcript-meta">
        <span className="transcript-label">Raw Transcript</span>
        <span className="word-count">{words} words</span>
      </div>
      <p className="transcript-text">{transcript}</p>
    </div>
  );
}
