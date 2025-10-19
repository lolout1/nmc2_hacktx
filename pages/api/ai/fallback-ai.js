/**
 * Fallback AI API Endpoint
 * 
 * Provides AI responses when Python backend is not available
 * Uses OpenAI directly from Node.js as backup
 */

import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, sessionKey, driverNumber, question, raceData } = req.body;

  if (!sessionKey || !driverNumber) {
    return res.status(400).json({ 
      error: 'sessionKey and driverNumber are required'
    });
  }

  if (!action || (action !== 'summary' && action !== 'question')) {
    return res.status(400).json({ 
      error: 'action must be "summary" or "question"'
    });
  }

  if (action === 'question' && !question) {
    return res.status(400).json({ 
      error: 'question is required for question action'
    });
  }

  console.log(`[Fallback AI] ${action} for driver #${driverNumber} in session ${sessionKey}`);

  // Get API key from environment
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;
  
  if (!apiKey) {
    console.log('[Fallback AI] No OpenAI API key found, using rule-based responses');
    // Fall back to rule-based responses
    try {
      const context = buildRaceContext(raceData, driverNumber);
      
      if (action === 'summary') {
        const summary = await generateSummary(context, driverNumber);
        return res.status(200).json({
          status: 'success',
          type: 'summary',
          driver_number: driverNumber,
          summary: summary,
          timestamp: new Date().toISOString(),
          source: 'rule-based'
        });
      } else {
        const answer = await answerQuestion(question, context, driverNumber);
        return res.status(200).json({
          status: 'success',
          type: 'question',
          driver_number: driverNumber,
          question: question,
          answer: answer,
          timestamp: new Date().toISOString(),
          source: 'rule-based'
        });
      }
    } catch (error) {
      return res.status(500).json({
        error: 'Rule-based AI failed',
        details: error.message
      });
    }
  }

  try {
    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });
    
    // Build context from race data
    const context = buildRaceContext(raceData, driverNumber);
    
    if (action === 'summary') {
      const summary = await generateOpenAISummary(openai, context, driverNumber);
      return res.status(200).json({
        status: 'success',
        type: 'summary',
        driver_number: driverNumber,
        summary: summary,
        timestamp: new Date().toISOString(),
        source: 'openai-fallback'
      });
    } else {
      const answer = await answerOpenAIQuestion(openai, question, context, driverNumber);
      return res.status(200).json({
        status: 'success',
        type: 'question',
        driver_number: driverNumber,
        question: question,
        answer: answer,
        timestamp: new Date().toISOString(),
        source: 'openai-fallback'
      });
    }

  } catch (error) {
    console.error(`[Fallback AI] ❌ Error:`, error);
    return res.status(500).json({
      error: 'AI analysis failed',
      details: error.message,
      hint: 'Using fallback AI system'
    });
  }
}

function buildRaceContext(raceData, driverNumber) {
  const context = {
    driver_number: driverNumber,
    session_info: raceData?.sessionData || {},
    current_lap: raceData?.currentLap || 1,
    timing_data: raceData?.timingData || {},
    driver_list: raceData?.driverList || {},
    weather: raceData?.weatherData || {},
    position_data: raceData?.positionData || {},
    track_status: raceData?.trackStatus || {}
  };

  // Extract driver-specific data
  if (context.timing_data?.Lines?.[driverNumber]) {
    const driverLine = context.timing_data.Lines[driverNumber];
    context.driver_state = {
      position: driverLine.Position,
      last_lap_time: driverLine.LastLapTime?.Value,
      best_lap_time: driverLine.BestLapTime?.Value,
      gap_to_leader: driverLine.GapToLeader,
      interval: driverLine.IntervalToPositionAhead?.Value,
      in_pit: driverLine.InPit,
      status: driverLine.InPit ? 'IN_PIT' : 'ON_TRACK'
    };
  }

  // Extract weather data
  if (context.weather) {
    context.conditions = {
      air_temperature: context.weather.AirTemp,
      track_temperature: context.weather.TrackTemp,
      humidity: context.weather.Humidity,
      pressure: context.weather.Pressure,
      wind_speed: context.weather.WindSpeed,
      wind_direction: context.weather.WindDirection,
      rainfall: context.weather.Rainfall
    };
  }

  return context;
}

async function generateSummary(context, driverNumber) {
  const driverName = context.driver_list?.[driverNumber]?.BroadcastName || `Driver #${driverNumber}`;
  const sessionName = context.session_info?.session_name || 'Unknown Session';
  const circuit = context.session_info?.circuit_short_name || 'Unknown Circuit';
  
  const driverState = context.driver_state || {};
  const conditions = context.conditions || {};

  return `**SITUATION**
${driverName} is currently in P${driverState.position || '?'} at ${circuit} during ${sessionName}. ${driverState.status === 'IN_PIT' ? 'Currently in pit lane.' : 'On track and racing.'}

**KEY CONCERNS**
• ${driverState.gap_to_leader ? `Gap to leader: ${driverState.gap_to_leader}` : 'Position relative to leader unknown'}
• ${driverState.interval ? `Gap to car ahead: ${driverState.interval}` : 'No clear gap data available'}
• ${conditions.air_temperature ? `Track conditions: ${conditions.air_temperature}°C air, ${conditions.track_temperature}°C track` : 'Weather conditions unknown'}

**OPPORTUNITIES**
• ${driverState.last_lap_time ? `Recent lap time: ${driverState.last_lap_time}s` : 'Lap time data not available'}
• ${driverState.best_lap_time ? `Best lap time: ${driverState.best_lap_time}s` : 'Best lap time unknown'}
• ${driverState.status === 'ON_TRACK' ? 'Currently on track - monitor for pit opportunities' : 'In pit lane - focus on pit stop efficiency'}

**IMMEDIATE ACTION**
${driverState.status === 'IN_PIT' ? 'Complete pit stop efficiently and return to track' : 'Continue current strategy and monitor lap times for optimal pit window'}

*Note: This is a fallback analysis. For more detailed insights, ensure Python dependencies are installed.*`;
}

async function answerQuestion(question, context, driverNumber) {
  const driverName = context.driver_list?.[driverNumber]?.BroadcastName || `Driver #${driverNumber}`;
  const driverState = context.driver_state || {};
  const conditions = context.conditions || {};

  // Simple rule-based responses for common questions
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes('pit') && lowerQuestion.includes('now')) {
    if (driverState.status === 'IN_PIT') {
      return `${driverName} is already in the pit lane. Focus on completing the pit stop efficiently.`;
    } else if (driverState.position && driverState.position <= 3) {
      return `As P${driverState.position}, ${driverName} should consider pit strategy carefully. Monitor lap times and tire degradation before pitting.`;
    } else {
      return `Consider pit timing based on tire condition and track position. Current position: P${driverState.position || 'unknown'}.`;
    }
  }

  if (lowerQuestion.includes('tire') || lowerQuestion.includes('tyre')) {
    return `Tire strategy depends on current compound and degradation. ${driverState.status === 'IN_PIT' ? 'Currently changing tires in pit lane.' : 'Monitor tire performance and plan next pit window.'}`;
  }

  if (lowerQuestion.includes('overtake') || lowerQuestion.includes('pass')) {
    const gap = driverState.interval;
    if (gap && parseFloat(gap) < 2.0) {
      return `${driverName} is within 2 seconds of the car ahead (${gap}s gap). Good overtaking opportunity if DRS is available.`;
    } else if (gap) {
      return `Gap to car ahead is ${gap}s. ${parseFloat(gap) > 5 ? 'Large gap - focus on lap time consistency.' : 'Moderate gap - look for overtaking opportunities.'}`;
    } else {
      return `Overtaking opportunities depend on track position and DRS availability. Current position: P${driverState.position || 'unknown'}.`;
    }
  }

  if (lowerQuestion.includes('rival') || lowerQuestion.includes('competition')) {
    return `Competitive analysis: ${driverName} is P${driverState.position || '?'}. ${driverState.gap_to_leader ? `Gap to leader: ${driverState.gap_to_leader}` : 'Monitor relative performance to rivals.'}`;
  }

  if (lowerQuestion.includes('risk')) {
    const risks = [];
    if (driverState.status === 'IN_PIT') risks.push('Currently in pit lane');
    if (conditions.rainfall) risks.push('Wet conditions');
    if (driverState.position && driverState.position > 10) risks.push('Lower track position');
    
    return `Key risks: ${risks.length > 0 ? risks.join(', ') : 'Monitor track conditions and position changes'}. Focus on consistent lap times and strategic pit stops.`;
  }

  // Generic response
  return `Based on current data: ${driverName} is P${driverState.position || '?'} ${driverState.status === 'IN_PIT' ? 'in pit lane' : 'on track'}. ${driverState.gap_to_leader ? `Gap to leader: ${driverState.gap_to_leader}` : ''} ${driverState.last_lap_time ? `Last lap: ${driverState.last_lap_time}s` : ''}. For more detailed analysis, ensure all data sources are available.`;
}

async function generateOpenAISummary(openai, context, driverNumber) {
  const driverName = context.driver_list?.[driverNumber]?.BroadcastName || `Driver #${driverNumber}`;
  const sessionName = context.session_info?.session_name || 'Unknown Session';
  const circuit = context.session_info?.circuit_short_name || 'Unknown Circuit';
  
  const driverState = context.driver_state || {};
  const conditions = context.conditions || {};

  const prompt = `You are an expert F1 race strategist. Analyze this race data and provide a strategic summary.

RACE CONTEXT:
- Driver: ${driverName} (#${driverNumber})
- Session: ${sessionName} at ${circuit}
- Current Position: P${driverState.position || '?'}
- Status: ${driverState.status || 'Unknown'}
- Gap to Leader: ${driverState.gap_to_leader || 'Unknown'}
- Last Lap Time: ${driverState.last_lap_time || 'Unknown'}s
- Best Lap Time: ${driverState.best_lap_time || 'Unknown'}s
- Air Temperature: ${conditions.air_temperature || 'Unknown'}°C
- Track Temperature: ${conditions.track_temperature || 'Unknown'}°C

Provide a concise strategic summary in this EXACT format:

**SITUATION**
[1-2 sentences describing current race position and performance]

**KEY CONCERNS**
• [Concern 1]
• [Concern 2]
• [Concern 3]

**OPPORTUNITIES**
• [Opportunity 1]
• [Opportunity 2]

**IMMEDIATE ACTION**
[One clear, specific recommendation]

Be direct, data-driven, and actionable.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 400
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI summary error:', error);
    // Fall back to rule-based summary
    return generateSummary(context, driverNumber);
  }
}

async function answerOpenAIQuestion(openai, question, context, driverNumber) {
  const driverName = context.driver_list?.[driverNumber]?.BroadcastName || `Driver #${driverNumber}`;
  const driverState = context.driver_state || {};
  const conditions = context.conditions || {};

  const prompt = `You are an expert F1 race strategist. Answer this question based on the race data.

QUESTION: ${question}

RACE DATA:
- Driver: ${driverName} (#${driverNumber})
- Position: P${driverState.position || '?'}
- Status: ${driverState.status || 'Unknown'}
- Gap to Leader: ${driverState.gap_to_leader || 'Unknown'}
- Last Lap: ${driverState.last_lap_time || 'Unknown'}s
- Best Lap: ${driverState.best_lap_time || 'Unknown'}s
- Air Temp: ${conditions.air_temperature || 'Unknown'}°C
- Track Temp: ${conditions.track_temperature || 'Unknown'}°C

Provide a clear, data-driven answer. Be specific and reference actual data points when possible.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI question error:', error);
    // Fall back to rule-based answer
    return answerQuestion(question, context, driverNumber);
  }
}
