"use client";

import { useState, useEffect, useRef } from "react";
import { ElevenLabsClient } from "elevenlabs";

const VoiceControls = ({ onVoiceServiceReady }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [voiceSettings, setVoiceSettings] = useState({
    stability: 0.5,
    similarityBoost: 0.8,
    voiceId: "pNInz6obpgDQGcFmaJgB", // Adam (default ElevenLabs voice)
  });

  const audioRef = useRef(null);
  const clientRef = useRef(null);

  // Initialize client only on the browser
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedKey = localStorage.getItem("ELEVEN_API_KEY");
    if (storedKey) {
      clientRef.current = new ElevenLabsClient({ apiKey: storedKey });
      setIsEnabled(true);
    }

    if (onVoiceServiceReady) {
      onVoiceServiceReady({
        speak,
        stopSpeaking,
        setVoiceSettings,
      });
    }
  }, [onVoiceServiceReady]);

  const handleApiKeySubmit = (e) => {
    e.preventDefault();
    if (typeof window === "undefined") return;

    localStorage.setItem("ELEVEN_API_KEY", apiKeyInput);
    clientRef.current = new ElevenLabsClient({ apiKey: apiKeyInput });
    setIsEnabled(true);
    setApiKeyInput("");
    setShowApiKeyForm(false);
  };

  const handleApiKeyRemove = () => {
    if (typeof window === "undefined") return;

    localStorage.removeItem("ELEVEN_API_KEY");
    clientRef.current = null;
    setIsEnabled(false);
    stopSpeaking();
  };

  const speak = async (text) => {
    if (!clientRef.current) {
      console.warn("ElevenLabs client not initialized.");
      return;
    }

    try {
      setCurrentText(text);
      setIsPlaying(true);

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceSettings.voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": localStorage.getItem("ELEVEN_API_KEY"),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: voiceSettings.stability,
              similarity_boost: voiceSettings.similarityBoost,
            },
          }),
        }
      );

      const audioData = await response.arrayBuffer();
      const blob = new Blob([audioData], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch (err) {
      console.error("Speech error:", err);
      setIsPlaying(false);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  return (
    <>
      {/* Voice Controls */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          left: "20px",
          backgroundColor: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "12px",
          color: "#fff",
          fontSize: "12px",
          zIndex: 1000,
          minWidth: "200px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontWeight: "600" }}>🎤 Voice Assistant</span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            ⚙️
          </button>
        </div>

        {!isEnabled ? (
          <div>
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: "11px",
                color: "#888",
              }}
            >
              Enable voice announcements
            </p>
            {!showApiKeyForm ? (
              <button
                onClick={() => setShowApiKeyForm(true)}
                style={{
                  width: "100%",
                  padding: "6px",
                  backgroundColor: "#00ff88",
                  color: "#000",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Add ElevenLabs API Key
              </button>
            ) : (
              <form onSubmit={handleApiKeySubmit}>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter API key"
                  style={{
                    width: "100%",
                    padding: "6px",
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #333",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "11px",
                    marginBottom: "6px",
                  }}
                />
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: "4px",
                      backgroundColor: "#00ff88",
                      color: "#000",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "10px",
                      cursor: "pointer",
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApiKeyForm(false)}
                    style={{
                      flex: 1,
                      padding: "4px",
                      backgroundColor: "#333",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "10px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <span style={{ color: "#00ff88", fontSize: "11px" }}>
                ✅ Voice Enabled
              </span>
              <button
                onClick={handleApiKeyRemove}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ff6b6b",
                  cursor: "pointer",
                  fontSize: "10px",
                }}
              >
                Remove Key
              </button>
            </div>

            {isPlaying && (
              <div
                style={{
                  backgroundColor: "#0a0a0a",
                  padding: "6px",
                  borderRadius: "4px",
                  marginBottom: "8px",
                  fontSize: "10px",
                  color: "#888",
                }}
              >
                🔊 {currentText.substring(0, 50)}...
              </div>
            )}

            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={stopSpeaking}
                disabled={!isPlaying}
                style={{
                  flex: 1,
                  padding: "4px",
                  backgroundColor: isPlaying ? "#ff6b6b" : "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "10px",
                  cursor: isPlaying ? "pointer" : "not-allowed",
                }}
              >
                ⏹️ Stop
              </button>
            </div>
          </div>
        )}

        {showSettings && isEnabled && (
          <div
            style={{
              marginTop: "12px",
              padding: "8px",
              backgroundColor: "#0a0a0a",
              borderRadius: "4px",
              border: "1px solid #333",
            }}
          >
            <div
              style={{
                marginBottom: "8px",
                fontSize: "11px",
                fontWeight: "600",
              }}
            >
              Voice Settings
            </div>

            <div style={{ marginBottom: "6px" }}>
              <label
                style={{
                  fontSize: "10px",
                  color: "#888",
                  display: "block",
                  marginBottom: "2px",
                }}
              >
                Stability: {voiceSettings.stability}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={voiceSettings.stability}
                onChange={(e) =>
                  setVoiceSettings({
                    ...voiceSettings,
                    stability: parseFloat(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "6px" }}>
              <label
                style={{
                  fontSize: "10px",
                  color: "#888",
                  display: "block",
                  marginBottom: "2px",
                }}
              >
                Similarity Boost: {voiceSettings.similarityBoost}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={voiceSettings.similarityBoost}
                onChange={(e) =>
                  setVoiceSettings({
                    ...voiceSettings,
                    similarityBoost: parseFloat(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </div>

            <div
              style={{
                fontSize: "10px",
                color: "#888",
                marginTop: "6px",
              }}
            >
              Voice ID: {voiceSettings.voiceId}
            </div>
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        style={{ display: "none" }}
      />
    </>
  );
};

export default VoiceControls;
