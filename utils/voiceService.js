import { useState, useRef, useEffect } from "react";

const VoiceService = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [voiceSettings, setVoiceSettings] = useState({
    voiceId: "pNInz6obpgDQGcFmaJgB", // Adam voice (default)
    stability: 0.5,
    similarityBoost: 0.5,
    style: 0.0,
    useSpeakerBoost: true
  });
  
  const audioRef = useRef(null);
  const [apiKey, setApiKey] = useState("");

  // Initialize with API key from environment or prompt user
  useEffect(() => {
    const storedKey = localStorage.getItem('elevenlabs_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setIsEnabled(true);
    }
  }, []);

  const speak = async (text, options = {}) => {
    if (!isEnabled || !apiKey) {
      console.warn("Voice service not enabled or API key missing");
      return;
    }

    try {
      setIsPlaying(true);
      setCurrentText(text);

      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: text,
          voiceId: voiceSettings.voiceId,
          voiceSettings: {
            stability: voiceSettings.stability,
            similarityBoost: voiceSettings.similarityBoost,
            style: voiceSettings.style,
            useSpeakerBoost: voiceSettings.useSpeakerBoost
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Voice API error: ${response.status} - ${errorData.details || errorData.error}`);
      }

      const data = await response.json();
      
      // Convert base64 audio to blob
      const audioBytes = atob(data.audio);
      const audioArray = new Uint8Array(audioBytes.length);
      for (let i = 0; i < audioBytes.length; i++) {
        audioArray[i] = audioBytes.charCodeAt(i);
      }
      
      const audioBlob = new Blob([audioArray], { type: data.mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }

    } catch (error) {
      console.error("Voice synthesis error:", error);
      setIsPlaying(false);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentText("");
  };

  const handleApiKeySubmit = (key) => {
    if (key.trim()) {
      setApiKey(key.trim());
      localStorage.setItem('elevenlabs_api_key', key.trim());
      setIsEnabled(true);
    }
  };

  const handleApiKeyRemove = () => {
    setApiKey("");
    localStorage.removeItem('elevenlabs_api_key');
    setIsEnabled(false);
  };

  // Voice announcement templates
  const announceBettingDecision = (driver, betType, amount, odds) => {
    const text = `Bet placed on ${driver} for ${betType} with ${amount} dollars at ${odds} to 1 odds. Good luck!`;
    speak(text);
  };

  const announceRacePrediction = (prediction) => {
    const text = `Race prediction: ${prediction.driver} has a ${Math.round(prediction.probability * 100)}% chance of winning. Current odds are ${prediction.odds} to 1.`;
    speak(text);
  };

  const announceStrategyRecommendation = (strategy) => {
    const text = `Strategy recommendation: ${strategy.action} with ${strategy.confidence}% confidence. ${strategy.reasoning}`;
    speak(text);
  };

  const announcePositionChange = (driver, oldPos, newPos) => {
    const change = newPos < oldPos ? "gained" : "lost";
    const positions = Math.abs(newPos - oldPos);
    const text = `${driver} has ${change} ${positions} position${positions > 1 ? 's' : ''}. Now in position ${newPos}.`;
    speak(text);
  };

  return {
    isEnabled,
    isPlaying,
    currentText,
    voiceSettings,
    setVoiceSettings,
    speak,
    stopSpeaking,
    handleApiKeySubmit,
    handleApiKeyRemove,
    announceBettingDecision,
    announceRacePrediction,
    announceStrategyRecommendation,
    announcePositionChange,
    audioRef
  };
};

export default VoiceService;
