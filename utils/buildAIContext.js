/**
 * Build concise AI context from race data
 * Extracts only strategic insights, not raw data
 */

export function buildStrategicContext(raceData, strategyData) {
  const { 
    sessionData, 
    driverNumber, 
    driverList,
    currentLap,
    weatherData,
    positionData,
    timingData
  } = raceData;

  // Extract driver-specific info
  const driver = driverList?.[driverNumber];
  const driverTiming = timingData?.Lines?.[driverNumber];
  
  // Build concise context
  const context = {
    // Session info
    session: {
      name: sessionData?.session_name || 'Unknown',
      circuit: sessionData?.circuit_short_name || 'Unknown',
      currentLap: currentLap || 0
    },

    // Driver status
    driver: {
      number: driverNumber,
      name: driver?.BroadcastName || `Driver ${driverNumber}`,
      team: driver?.TeamName || 'Unknown',
      position: driverTiming?.Position || '?',
      lastLapTime: driverTiming?.LastLapTime?.Value || null,
      bestLapTime: driverTiming?.BestLapTime?.Value || null,
      gapToLeader: driverTiming?.GapToLeader || null,
      intervalAhead: driverTiming?.IntervalToPositionAhead?.Value || null,
      inPit: driverTiming?.InPit || false
    },

    // Strategy insights (from ML backend)
    strategy: strategyData ? {
      topDecision: strategyData.topDecision?.action || 'Unknown',
      confidence: strategyData.topDecision?.confidence || 0,
      expectedOutcome: strategyData.topDecision?.expectedOutcome || 'Unknown',
      optimalPitLap: strategyData.pitWindow?.optimal || null,
      riskLevel: strategyData.risk?.level || 'Unknown',
      riskScore: strategyData.risk?.score || 0,
      topRisks: strategyData.risk?.factors?.slice(0, 2).map(f => f.name) || []
    } : null,

    // Weather conditions
    conditions: weatherData ? {
      airTemp: weatherData.AirTemp || null,
      trackTemp: weatherData.TrackTemp || null,
      humidity: weatherData.Humidity || null,
      rainfall: weatherData.Rainfall || 0
    } : null,

    // Race position context
    raceContext: {
      totalDrivers: Object.keys(driverList || {}).length,
      currentPosition: driverTiming?.Position || '?',
      positionsGained: calculatePositionsGained(driverTiming)
    }
  };

  return context;
}

function calculatePositionsGained(driverTiming) {
  if (!driverTiming?.Position || !driverTiming?.GridPosition) return null;
  return driverTiming.GridPosition - driverTiming.Position;
}

/**
 * Format context for AI prompt
 */
export function formatContextForAI(context) {
  if (!context) return 'No race data available';

  const lines = [];

  // Session
  lines.push(`**SESSION**: ${context.session.name} at ${context.session.circuit} (Lap ${context.session.currentLap})`);
  
  // Driver
  lines.push(`**DRIVER**: ${context.driver.name} (#${context.driver.number}) - ${context.driver.team}`);
  lines.push(`**POSITION**: P${context.driver.position}${context.driver.gapToLeader ? ` (${context.driver.gapToLeader} to leader)` : ''}`);
  
  if (context.driver.lastLapTime) {
    lines.push(`**LAP TIMES**: Last: ${context.driver.lastLapTime}s | Best: ${context.driver.bestLapTime}s`);
  }

  if (context.driver.inPit) {
    lines.push(`**STATUS**: IN PIT LANE`);
  }

  // Strategy
  if (context.strategy) {
    lines.push('');
    lines.push(`**STRATEGY RECOMMENDATION**: ${context.strategy.topDecision} (${context.strategy.confidence}% confidence)`);
    lines.push(`**EXPECTED**: ${context.strategy.expectedOutcome}`);
    
    if (context.strategy.optimalPitLap) {
      lines.push(`**OPTIMAL PIT STOP**: Lap ${context.strategy.optimalPitLap}`);
    }
    
    lines.push(`**RISK**: ${context.strategy.riskLevel} (${context.strategy.riskScore}/100)`);
    if (context.strategy.topRisks.length > 0) {
      lines.push(`**TOP RISKS**: ${context.strategy.topRisks.join(', ')}`);
    }
  }

  // Weather
  if (context.conditions) {
    lines.push('');
    lines.push(`**CONDITIONS**: ${context.conditions.trackTemp}°C track, ${context.conditions.airTemp}°C air${context.conditions.rainfall > 0 ? ', RAIN' : ''}`);
  }

  return lines.join('\n');
}

