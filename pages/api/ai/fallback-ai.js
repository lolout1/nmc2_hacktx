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

  const { action, sessionKey, driverNumber, question, snapshot, context, strategicData, driverName, simple } = req.body;

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

  console.log(`[Fallback AI] ===== RECEIVED REQUEST =====`);
  console.log(`[Fallback AI] Action: ${action}`);
  console.log(`[Fallback AI] Driver: #${driverNumber}`);
  console.log(`[Fallback AI] Session: ${sessionKey}`);
  console.log(`[Fallback AI] Snapshot keys:`, snapshot ? Object.keys(snapshot) : 'NULL');
  console.log(`[Fallback AI] Context length:`, context ? `${context.length} chars` : 'NULL');
  console.log(`[Fallback AI] Strategic data:`, strategicData ? 'Present' : 'NULL');

  // Get API key from environment
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;
  console.log(`[Fallback AI] API key status:`, apiKey ? `Found (${apiKey.substring(0, 15)}...)` : 'NOT FOUND');
  
  if (!apiKey) {
    console.log('[Fallback AI] No OpenAI API key found, using rule-based responses');
    // Fall back to rule-based responses
    try {
      // Prefer compact snapshot and/or formatted context coming from the client
      if (snapshot || context) {
        // Intent fast-path using strategicData
        if (action === 'question') {
          if (simple) {
            const answer = generateSimpleRuleBasedAnswer(question, driverName || `Driver #${driverNumber}`);
            console.log('[Fallback AI] ⚡ Simple rule-based answer');
            return res.status(200).json({
              status: 'success',
              type: 'question',
              driver_number: driverNumber,
              question,
              answer: answer,
              timestamp: new Date().toISOString(),
              source: 'rule-based-simple'
            });
          } else {
            const fast = answerFromStrategicData(question, strategicData);
            if (fast) {
              console.log('[Fallback AI] ⚡ Fast intent answer from strategicData');
              return res.status(200).json({
                status: 'success',
                type: 'question',
                driver_number: driverNumber,
                question,
                answer: fast,
                timestamp: new Date().toISOString(),
                source: 'rule-based-fast'
              });
            }
          }
        }
        if (action === 'summary') {
          if (simple) {
            const summary = generateSimpleRuleBasedSummary(driverName || `Driver #${driverNumber}`);
            console.log(`[Fallback AI] ✅ Generated simple rule-based summary (${summary?.length || 0} chars)`);
            return res.status(200).json({
              status: 'success',
              type: 'summary',
              driver_number: driverNumber,
              summary,
              timestamp: new Date().toISOString(),
              source: 'rule-based-simple'
            });
          } else {
            const summary = generateRuleSummaryFromSnapshot(snapshot, context, strategicData, driverNumber);
            console.log(`[Fallback AI] ✅ Generated rule-based summary (${summary?.length || 0} chars)`);
            return res.status(200).json({
              status: 'success',
              type: 'summary',
              driver_number: driverNumber,
              summary,
              timestamp: new Date().toISOString(),
              source: 'rule-based'
            });
          }
        } else {
          if (simple) {
            const answer = generateSimpleRuleBasedAnswer(question, driverName || `Driver #${driverNumber}`);
            console.log(`[Fallback AI] ✅ Generated simple rule-based answer (${answer?.length || 0} chars)`);
            return res.status(200).json({
              status: 'success',
              type: 'question',
              driver_number: driverNumber,
              question,
              answer,
              timestamp: new Date().toISOString(),
              source: 'rule-based-simple'
            });
          } else {
            const answer = answerRuleFromSnapshot(question, snapshot, context, strategicData, driverNumber);
            console.log(`[Fallback AI] ✅ Generated rule-based answer (${answer?.length || 0} chars)`);
            return res.status(200).json({
              status: 'success',
              type: 'question',
              driver_number: driverNumber,
              question,
              answer,
              timestamp: new Date().toISOString(),
              source: 'rule-based'
            });
          }
        }
      }

      // As a fallback, try to build a minimal context from strategicData
      const minimalContext = strategicData
        ? {
            driver_state: {
              position: strategicData?.driver?.position,
            },
          }
        : {};

      if (action === 'summary') {
        const summary = `**SITUATION**\n${context || 'Insufficient race context provided.'}`;
        return res.status(200).json({
          status: 'success',
          type: 'summary',
          driver_number: driverNumber,
          summary,
          timestamp: new Date().toISOString(),
          source: 'rule-based'
        });
      } else {
        const answer = `Based on available context: ${context ? 'see provided race data.' : 'not enough data to provide a detailed answer.'}`;
        return res.status(200).json({
          status: 'success',
          type: 'question',
          driver_number: driverNumber,
          question,
          answer,
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
    
    console.log('[Fallback AI] Using OpenAI with formatted context');
    
    if (action === 'summary') {
      if (simple) {
        const summary = await generateSimpleOpenAISummary(openai, driverName || `Driver #${driverNumber}`, sessionKey);
        console.log(`[Fallback AI] ✅ Generated simple OpenAI summary (${summary?.length || 0} chars)`);
        return res.status(200).json({
          status: 'success',
          type: 'summary',
          driver_number: driverNumber,
          summary: summary,
          timestamp: new Date().toISOString(),
          source: 'openai-simple'
        });
      } else {
        const summary = await generateOpenAISummaryFromContext(openai, context, strategicData, driverNumber);
        console.log(`[Fallback AI] ✅ Generated OpenAI summary (${summary?.length || 0} chars)`);
        return res.status(200).json({
          status: 'success',
          type: 'summary',
          driver_number: driverNumber,
          summary: summary,
          timestamp: new Date().toISOString(),
          source: 'openai-fallback'
        });
      }
    } else {
      // Intent fast-path even when OpenAI key exists (answer immediately)
      const fast = answerFromStrategicData(question, strategicData);
      if (fast) {
        console.log('[Fallback AI] ⚡ Fast intent answer from strategicData (with key)');
        return res.status(200).json({
          status: 'success',
          type: 'question',
          driver_number: driverNumber,
          question,
          answer: fast,
          timestamp: new Date().toISOString(),
          source: 'strategic-fast'
        });
      }
      const answer = await answerOpenAIQuestionFromContext(openai, question, context, strategicData, driverNumber);
      console.log(`[Fallback AI] ✅ Generated OpenAI answer (${answer?.length || 0} chars)`);
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
    console.error(`[Fallback AI] ❌ OpenAI error:`, error);
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

// New functions that use formatted context
async function generateOpenAISummaryFromContext(openai, formattedContext, strategicData, driverNumber) {
  const prompt = `You are an expert F1 race strategist. Analyze this race data and provide a strategic summary.

CURRENT RACE DATA:
${formattedContext}

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
[1 sentence with clear actionable recommendation]

Keep it brief and actionable.`;

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
    return `Unable to generate summary. Error: ${error.message}`;
  }
}

async function answerOpenAIQuestionFromContext(openai, question, formattedContext, strategicData, driverNumber) {
  const prompt = `You are an expert F1 race strategist. Answer this question based on the race data.

CURRENT RACE DATA:
${formattedContext}

QUESTION: ${question}

Provide a concise, data-driven answer (2-3 sentences max). Be specific and actionable.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI question error:', error);
    return `Unable to answer question. Error: ${error.message}`;
  }
}

// Simple rule-based generation when compact snapshot/formatted context is available
function generateRuleSummaryFromSnapshot(snapshot, formattedContext, strategicData, driverNumber) {
  // Heuristic: extract key lines from formatted context
  const lines = (formattedContext || '').split('\n').map(l => l.trim()).filter(Boolean);
  const sessionLine = lines.find(l => l.startsWith('**SESSION**')) || '';
  const driverLine = lines.find(l => l.startsWith('**DRIVER**')) || '';
  const positionLine = lines.find(l => l.startsWith('**POSITION**')) || '';
  const strategyLine = lines.find(l => l.startsWith('**STRATEGY RECOMMENDATION**')) || '';
  const expectedLine = lines.find(l => l.startsWith('**EXPECTED**')) || '';
  const pitLine = lines.find(l => l.startsWith('**OPTIMAL PIT STOP**')) || '';
  const riskLine = lines.find(l => l.startsWith('**RISK**')) || '';

  // If snapshot exists, prefer its values
  const snapSummary = snapshot
    ? [
        '**SITUATION**',
        `${snapshot?.driver?.name || `Driver #${driverNumber}`} in P${snapshot?.status?.position ?? '?'}`,
        '',
        '**KEY CONCERNS**',
        `• Gap to leader: ${snapshot?.status?.gapToLeader ?? 'n/a'}`,
        `• Interval ahead: ${snapshot?.status?.intervalAhead ?? 'n/a'}`,
        '',
        '**OPPORTUNITIES**',
        snapshot?.status?.lastLapTime ? `• Last lap: ${snapshot.status.lastLapTime}s` : null,
        snapshot?.status?.bestLapTime ? `• Best: ${snapshot.status.bestLapTime}s` : null,
        '',
        '**IMMEDIATE ACTION**',
        strategyLine ? strategyLine.replace('**STRATEGY RECOMMENDATION**: ', '') : 'Maintain pace and target clean air.'
      ].filter(Boolean).join('\n')
    : null;

  if (snapSummary) return snapSummary;

  return [
    '**SITUATION**',
    [sessionLine.replace('**SESSION**: ', ''), positionLine.replace('**POSITION**: ', '')].filter(Boolean).join(' — '),
    '',
    '**KEY CONCERNS**',
    riskLine ? `• ${riskLine.replace('**RISK**: ', '')}` : '• Risk unknown',
    '',
    '**OPPORTUNITIES**',
    expectedLine ? `• ${expectedLine.replace('**EXPECTED**: ', '')}` : '• Opportunity not estimated',
    pitLine ? `• ${pitLine.replace('**OPTIMAL PIT STOP**: ', '')}` : null,
    '',
    '**IMMEDIATE ACTION**',
    strategyLine ? strategyLine.replace('**STRATEGY RECOMMENDATION**: ', '') : 'Hold current plan and monitor gaps and tire temps.'
  ]
    .filter(Boolean)
    .join('\n');
}

function answerRuleFromSnapshot(question, snapshot, formattedContext, strategicData, driverNumber) {
  const q = (question || '').toLowerCase();
  const find = (prefix) => (formattedContext || '').split('\n').find(l => l.startsWith(prefix)) || '';
  const positionLine = find('**POSITION**');
  const strategyLine = find('**STRATEGY RECOMMENDATION**');
  const pitLine = find('**OPTIMAL PIT STOP**');
  const riskLine = find('**RISK**');

  if (q.includes('pit')) {
    if (snapshot?.status?.inPit) return 'Currently in pit lane. Focus on stop execution and out-lap traffic.';
    if (pitLine) return `Optimal pit window: ${pitLine.replace('**OPTIMAL PIT STOP**: ', '')}. Balance the call against ${positionLine.replace('**POSITION**: ', '')}.`;
    return 'Pit timing depends on tire state and gaps. Monitor pace and undercut/overcut windows.';
  }
  if (q.includes('risk')) {
    if (riskLine) return `Risk assessment: ${riskLine.replace('**RISK**: ', '')}. Adjust strategy accordingly.`;
    if (snapshot?.conditions?.rainfall) return 'Wet track risk present. Increase margins and avoid lockups.';
    return 'Risk data limited; keep margins, avoid traffic, and protect tire temps.';
  }
  if (q.includes('strategy') || q.includes('plan')) {
    if (strategyLine) return `Recommended strategy: ${strategyLine.replace('**STRATEGY RECOMMENDATION**: ', '')}.`;
    return 'Maintain consistent pace, protect tire temps, and target clean air.';
  }

  // Default concise answer
  const defaults = [
    snapshot?.status?.position ? `Current P${snapshot.status.position}.` : null,
    positionLine ? `Current ${positionLine.replace('**POSITION**: ', '')}.` : null,
    strategyLine ? `Plan: ${strategyLine.replace('**STRATEGY RECOMMENDATION**: ', '')}.` : null,
    pitLine ? `Pit: ${pitLine.replace('**OPTIMAL PIT STOP**: ', '')}.` : null
  ].filter(Boolean).join(' ');

  return defaults
    || 'Data limited; continue current pace and monitor gaps and tire temperatures.';
}

// Fast deterministic answers using strategicData
function answerFromStrategicData(question, strategicData) {
  if (!question || !strategicData) return null;
  const q = question.toLowerCase();
  const decision = strategicData?.topDecision?.action;
  const confidence = strategicData?.topDecision?.confidence;
  const expected = strategicData?.topDecision?.expectedOutcome;
  const pitLap = strategicData?.pitWindow?.optimal;
  const risk = strategicData?.risk?.level;

  if (q.includes('pit')) {
    if (typeof pitLap !== 'undefined') {
      return `Optimal pit lap: ${pitLap}. Current recommendation: ${decision || 'N/A'} (${confidence || 0}% confidence).`;
    }
  }
  if (q.includes('strategy') || q.includes('plan')) {
    if (decision) {
      return `Recommended strategy: ${decision} (${confidence || 0}% confidence). ${expected ? `Expected outcome: ${expected}.` : ''}`;
    }
  }
  if (q.includes('risk')) {
    if (risk) {
      return `Risk level: ${risk}. Adjust margins and avoid traffic until conditions improve.`;
    }
  }
  return null;
}

// Simple ChatGPT functions for basic F1 strategy responses
async function generateSimpleOpenAISummary(openai, driverName, sessionKey) {
  const systemPrompt = `You are an F1 race strategist. Provide a realistic race strategy summary for ${driverName} in session ${sessionKey}. 
  
  Focus on:
  - Current race situation and position
  - Tire strategy and pit window opportunities  
  - Key risks and opportunities
  - Immediate tactical priorities
  
  Keep it concise, professional, and realistic. Use F1 terminology.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate a race strategy summary for ${driverName}.` }
    ],
    max_tokens: 300,
    temperature: 0.7
  });

  return response.choices[0].message.content;
}

async function generateSimpleOpenAIAnswer(openai, question, driverName, sessionKey) {
  const systemPrompt = `You are an F1 race strategist. Answer questions about race strategy for ${driverName} in session ${sessionKey}.
  
  Provide realistic, professional F1 strategy advice. Use proper F1 terminology.
  Be concise but informative. Focus on practical race decisions.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ],
    max_tokens: 200,
    temperature: 0.7
  });

  return response.choices[0].message.content;
}

function generateSimpleRuleBasedSummary(driverName) {
  return `**RACE SITUATION**
${driverName} is currently racing in the session.

**STRATEGY FOCUS**
• Monitor tire degradation and fuel consumption
• Watch for optimal pit window opportunities  
• Maintain consistent lap times

**KEY PRIORITIES**
• Clean air and track position
• Tire management for race distance
• Fuel efficiency for strategy flexibility`;
}

function generateSimpleRuleBasedAnswer(question, driverName) {
  const q = question.toLowerCase();
  
  if (q.includes('pit') || q.includes('best round') || q.includes('when should')) {
    return `Optimal pit window typically opens around lap 15-20. Monitor tire degradation and fuel consumption. Consider undercutting competitors if you have pace advantage.`;
  }
  
  if (q.includes('strategy') || q.includes('plan')) {
    return `Focus on tire management and fuel efficiency. Maintain consistent pace while preserving tires for the race distance. Watch for safety car opportunities.`;
  }
  
  if (q.includes('risk') || q.includes('danger')) {
    return `Key risks include tire degradation, fuel consumption, and traffic. Maintain safe margins and avoid unnecessary battles that could damage the car.`;
  }
  
  if (q.includes('overtake') || q.includes('pass')) {
    return `Look for DRS zones and braking opportunities. Ensure you have pace advantage before attempting overtakes. Consider the risk vs reward of each move.`;
  }
  
  return `Based on current race conditions, focus on maintaining consistent pace and managing tires effectively. Monitor fuel consumption and watch for strategic opportunities.`;
}
