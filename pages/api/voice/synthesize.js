/**
 * ElevenLabs Text-to-Speech API Proxy
 * Handles voice synthesis requests to avoid CORS issues
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, voiceId = "pNInz6obpgDQGcFmaJgB", voiceSettings = {} } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const apiKey = req.headers['xi-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'ElevenLabs API key required' });
  }

  try {
    console.log(`[Voice API] Synthesizing: "${text.substring(0, 50)}..."`);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: voiceSettings.stability || 0.5,
          similarity_boost: voiceSettings.similarityBoost || 0.5,
          style: voiceSettings.style || 0.0,
          use_speaker_boost: voiceSettings.useSpeakerBoost || true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Voice API] ElevenLabs error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ 
        error: 'ElevenLabs API error', 
        details: errorText 
      });
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    console.log(`[Voice API] ✓ Voice synthesis successful`);

    return res.status(200).json({
      success: true,
      audio: base64Audio,
      mimeType: 'audio/mpeg'
    });

  } catch (error) {
    console.error(`[Voice API] Error:`, error);
    return res.status(500).json({
      error: 'Voice synthesis failed',
      details: error.message
    });
  }
}
