import { useState, useEffect } from "react";
import VoiceService from "@monaco/utils/voiceService";

const VoiceControls = ({ onVoiceServiceReady }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  
  const voiceService = VoiceService();

  useEffect(() => {
    if (onVoiceServiceReady) {
      onVoiceServiceReady(voiceService);
    }
  }, [voiceService, onVoiceServiceReady]);

  const handleApiKeySubmit = (e) => {
    e.preventDefault();
    voiceService.handleApiKeySubmit(apiKeyInput);
    setApiKeyInput("");
    setShowApiKeyForm(false);
  };

  const handleApiKeyRemove = () => {
    voiceService.handleApiKeyRemove();
    setShowApiKeyForm(false);
  };

  return (
    <>
      {/* Voice Controls */}
      <div style={{
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
        minWidth: "200px"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px"
        }}>
          <span style={{ fontWeight: "600" }}>🎤 Voice Assistant</span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            ⚙️
          </button>
        </div>

        {!voiceService.isEnabled ? (
          <div>
            <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#888" }}>
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
                  fontWeight: "600"
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
                    marginBottom: "6px"
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
                      cursor: "pointer"
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
                      cursor: "pointer"
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
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px"
            }}>
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
                  fontSize: "10px"
                }}
              >
                Remove Key
              </button>
            </div>

            {voiceService.isPlaying && (
              <div style={{
                backgroundColor: "#0a0a0a",
                padding: "6px",
                borderRadius: "4px",
                marginBottom: "8px",
                fontSize: "10px",
                color: "#888"
              }}>
                🔊 {voiceService.currentText.substring(0, 50)}...
              </div>
            )}

            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={voiceService.stopSpeaking}
                disabled={!voiceService.isPlaying}
                style={{
                  flex: 1,
                  padding: "4px",
                  backgroundColor: voiceService.isPlaying ? "#ff6b6b" : "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "10px",
                  cursor: voiceService.isPlaying ? "pointer" : "not-allowed"
                }}
              >
                ⏹️ Stop
              </button>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && voiceService.isEnabled && (
          <div style={{
            marginTop: "12px",
            padding: "8px",
            backgroundColor: "#0a0a0a",
            borderRadius: "4px",
            border: "1px solid #333"
          }}>
            <div style={{ marginBottom: "8px", fontSize: "11px", fontWeight: "600" }}>
              Voice Settings
            </div>
            
            <div style={{ marginBottom: "6px" }}>
              <label style={{ fontSize: "10px", color: "#888", display: "block", marginBottom: "2px" }}>
                Stability: {voiceService.voiceSettings.stability}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={voiceService.voiceSettings.stability}
                onChange={(e) => voiceService.setVoiceSettings({
                  ...voiceService.voiceSettings,
                  stability: parseFloat(e.target.value)
                })}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "6px" }}>
              <label style={{ fontSize: "10px", color: "#888", display: "block", marginBottom: "2px" }}>
                Similarity Boost: {voiceService.voiceSettings.similarityBoost}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={voiceService.voiceSettings.similarityBoost}
                onChange={(e) => voiceService.setVoiceSettings({
                  ...voiceService.voiceSettings,
                  similarityBoost: parseFloat(e.target.value)
                })}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ fontSize: "10px", color: "#888", marginTop: "6px" }}>
              Voice ID: {voiceService.voiceSettings.voiceId}
            </div>
          </div>
        )}
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={voiceService.audioRef}
        onEnded={() => voiceService.setIsPlaying(false)}
        style={{ display: "none" }}
      />
    </>
  );
};

export default VoiceControls;
