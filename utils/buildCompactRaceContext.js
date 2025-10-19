/**
 * Build compact race context with focused driver and surrounding cars
 * Includes recent data points (last 3-5 laps) for better AI analysis
 */

export function buildCompactRaceContext(raceData, driverNumber, strategies = null) {
  if (!raceData || !driverNumber) {
    return null;
  }

  const {
    timingData,
    driverList,
    positionData,
    weatherData,
    currentLap,
    sessionData,
    carData // Added for telemetry
  } = raceData;

  // Get focused driver info
  const focusedDriver = driverList?.[driverNumber];
  const focusedTiming = timingData?.Lines?.[driverNumber];

  if (!focusedDriver || !focusedTiming) {
    return null;
  }

  // Extract last 3-5 lap times from BestSpeeds or Stints
  const getRecentLapTimes = (timing) => {
    const lapTimes = [];

    // Try to extract from BestSpeeds (contains lap history)
    if (timing.BestSpeeds) {
      Object.entries(timing.BestSpeeds).forEach(([lapNum, speed]) => {
        if (speed.LapTime) {
          lapTimes.push({
            lap: parseInt(lapNum),
            time: speed.LapTime
          });
        }
      });
    }

    // Sort by lap number and get last 5
    return lapTimes.sort((a, b) => b.lap - a.lap).slice(0, 5);
  };

  // Get car telemetry data if available
  const getCarData = (num) => {
    const entries = carData?.Entries?.[num];
    if (!entries) return null;

    return {
      speed: entries.Channels?.['0'], // Speed
      rpm: entries.Channels?.['2'], // RPM
      gear: entries.Channels?.['3'], // Gear
      throttle: entries.Channels?.['4'], // Throttle
      drs: entries.Channels?.['45'] // DRS
    };
  };

  // Build focused driver data
  const focusedDriverData = {
    number: driverNumber,
    name: focusedDriver.BroadcastName || focusedDriver.FullName,
    teamName: focusedDriver.TeamName,
    teamColor: focusedDriver.TeamColour,
    position: focusedTiming.Position,
    gapToLeader: focusedTiming.GapToLeader,
    intervalAhead: focusedTiming.IntervalToPositionAhead?.Value,
    lastLapTime: focusedTiming.LastLapTime?.Value,
    bestLapTime: focusedTiming.BestLapTime?.Value,
    numberOfLaps: focusedTiming.NumberOfLaps,
    currentLap: focusedTiming.NumberOfLaps, // Current lap number
    inPit: focusedTiming.InPit,
    pitStops: focusedTiming.NumberOfPitStops,
    sectors: focusedTiming.Sectors || [],
    recentLaps: getRecentLapTimes(focusedTiming),
    carData: getCarData(driverNumber),
    // Tire data
    tireAge: focusedTiming.Stint?.TotalLaps,
    compound: focusedTiming.Stint?.Compound
  };

  // Get surrounding drivers (3 ahead, 3 behind)
  const currentPosition = parseInt(focusedTiming.Position);
  const surroundingDrivers = [];

  if (timingData?.Lines) {
    Object.entries(timingData.Lines).forEach(([num, timing]) => {
      const pos = parseInt(timing.Position);
      if (pos >= currentPosition - 3 && pos <= currentPosition + 3 && num !== String(driverNumber)) {
        const driver = driverList?.[num];
        if (driver && timing) {
          surroundingDrivers.push({
            number: num,
            name: driver.BroadcastName || driver.FullName,
            teamName: driver.TeamName,
            position: pos,
            gapToLeader: timing.GapToLeader,
            intervalAhead: timing.IntervalToPositionAhead?.Value,
            lastLapTime: timing.LastLapTime?.Value,
            bestLapTime: timing.BestLapTime?.Value,
            numberOfLaps: timing.NumberOfLaps,
            currentLap: timing.NumberOfLaps,
            inPit: timing.InPit,
            pitStops: timing.NumberOfPitStops,
            recentLaps: getRecentLapTimes(timing),
            tireAge: timing.Stint?.TotalLaps,
            compound: timing.Stint?.Compound
          });
        }
      }
    });
  }

  // Sort surrounding drivers by position
  surroundingDrivers.sort((a, b) => a.position - b.position);

  // Get top 5 drivers in race (for race winner predictions)
  const topDrivers = [];
  if (timingData?.Lines) {
    Object.entries(timingData.Lines).forEach(([num, timing]) => {
      const pos = parseInt(timing.Position);
      if (pos <= 5) {
        const driver = driverList?.[num];
        if (driver && timing) {
          topDrivers.push({
            number: num,
            name: driver.BroadcastName || driver.FullName,
            teamName: driver.TeamName,
            position: pos,
            gapToLeader: timing.GapToLeader,
            lastLapTime: timing.LastLapTime?.Value,
            bestLapTime: timing.BestLapTime?.Value,
            currentLap: timing.NumberOfLaps,
            pitStops: timing.NumberOfPitStops,
            recentLaps: getRecentLapTimes(timing),
            tireAge: timing.Stint?.TotalLaps,
            compound: timing.Stint?.Compound
          });
        }
      }
    });
  }
  topDrivers.sort((a, b) => a.position - b.position);

  // Track conditions
  const conditions = weatherData ? {
    airTemp: weatherData.AirTemp,
    trackTemp: weatherData.TrackTemp,
    humidity: weatherData.Humidity,
    rainfall: weatherData.Rainfall,
    windSpeed: weatherData.WindSpeed
  } : null;

  // Session info
  const session = {
    type: sessionData?.Type || sessionData?.type || 'Unknown',
    name: sessionData?.Name || sessionData?.name || 'Unknown',
    currentLap: currentLap || focusedDriverData.numberOfLaps,
    totalLaps: sessionData?.TotalLaps || sessionData?.total_laps
  };

  // ML/Monte Carlo predictions and strategies
  const mlPredictions = strategies ? {
    topDecision: strategies.topDecision,
    pitWindow: strategies.pitWindow,
    risk: strategies.risk,
    predictions: strategies.predictions,
    confidence: strategies.confidence,
    methodology: {
      monteCarlo: 'Monte Carlo simulation with 10,000+ iterations',
      mlModels: 'Random Forest & XGBoost ensemble',
      inputs: 'Lap times, tire deg, fuel load, traffic, weather',
      outputs: 'Optimal pit lap, risk score, final position probability'
    }
  } : null;

  return {
    session,
    focusedDriver: focusedDriverData,
    surroundingDrivers,
    topDrivers, // Top 5 for race winner analysis
    conditions,
    mlPredictions
  };
}

/**
 * Format compact race context for AI consumption
 */
export function formatCompactContextForAI(compactContext) {
  if (!compactContext) {
    return 'No race data available.';
  }

  const { session, focusedDriver, surroundingDrivers, topDrivers, conditions, mlPredictions } = compactContext;

  const lines = [];

  // Session header
  const lapInfo = session.totalLaps
    ? `Lap ${session.currentLap}/${session.totalLaps}`
    : `Lap ${session.currentLap}`;
  lines.push(`**SESSION**: ${session.name} (${session.type}) - ${lapInfo}`);
  lines.push('');

  // Focused driver - current state
  lines.push(`**FOCUSED DRIVER**: #${focusedDriver.number} ${focusedDriver.name} (${focusedDriver.teamName})`);
  lines.push(`  Current Lap: ${focusedDriver.currentLap}`);
  lines.push(`  Position: P${focusedDriver.position}`);
  lines.push(`  Gap to Leader: ${focusedDriver.gapToLeader || 'Leader'}`);
  lines.push(`  Interval Ahead: ${focusedDriver.intervalAhead || 'N/A'}`);
  lines.push(`  Last Lap: ${focusedDriver.lastLapTime || 'N/A'}`);
  lines.push(`  Best Lap: ${focusedDriver.bestLapTime || 'N/A'}`);
  lines.push(`  Pit Stops: ${focusedDriver.pitStops || 0}`);
  lines.push(`  Status: ${focusedDriver.inPit ? 'IN PIT' : 'ON TRACK'}`);

  // Tire info
  if (focusedDriver.compound || focusedDriver.tireAge) {
    lines.push(`  Tires: ${focusedDriver.compound || 'Unknown'} (${focusedDriver.tireAge || 0} laps old)`);
  }

  // Recent lap history
  if (focusedDriver.recentLaps && focusedDriver.recentLaps.length > 0) {
    lines.push(`  Recent Laps: ${focusedDriver.recentLaps.map(l => `L${l.lap}:${l.time}`).join(', ')}`);
  }
  lines.push('');

  // Surrounding drivers with their current laps
  if (surroundingDrivers.length > 0) {
    lines.push(`**SURROUNDING CARS** (±3 positions):`);
    surroundingDrivers.forEach(driver => {
      const relative = driver.position < focusedDriver.position ? 'AHEAD' : 'BEHIND';

      lines.push(`  P${driver.position} - #${driver.number} ${driver.name} (${driver.teamName}) - ${relative}`);
      lines.push(`    Lap ${driver.currentLap} | Last: ${driver.lastLapTime || 'N/A'} | Best: ${driver.bestLapTime || 'N/A'} | Pits: ${driver.pitStops || 0}`);

      // Show tire info if available
      if (driver.compound || driver.tireAge) {
        lines.push(`    Tires: ${driver.compound || '?'} (${driver.tireAge || 0} laps)`);
      }

      // Show recent laps if available
      if (driver.recentLaps && driver.recentLaps.length > 0) {
        const recentLapStr = driver.recentLaps.slice(0, 3).map(l => `L${l.lap}:${l.time}`).join(', ');
        lines.push(`    Recent: ${recentLapStr}`);
      }
    });
    lines.push('');
  }

  // Track conditions
  if (conditions) {
    lines.push(`**CONDITIONS**:`);
    lines.push(`  Air: ${conditions.airTemp}°C | Track: ${conditions.trackTemp}°C`);
    lines.push(`  Humidity: ${conditions.humidity}% | Wind: ${conditions.windSpeed} km/h`);
    if (conditions.rainfall) {
      lines.push(`  ⚠️ RAINFALL DETECTED`);
    }
    lines.push('');
  }

  // Top 5 drivers (for race winner analysis)
  if (topDrivers && topDrivers.length > 0) {
    lines.push(`**TOP 5 RACE POSITIONS** (for winner prediction):`);
    topDrivers.forEach(driver => {
      const isLeader = driver.position === 1;
      lines.push(`  P${driver.position} - #${driver.number} ${driver.name} (${driver.teamName})`);
      lines.push(`    Lap ${driver.currentLap} | Gap: ${driver.gapToLeader || 'LEADER'} | Last: ${driver.lastLapTime || 'N/A'} | Best: ${driver.bestLapTime || 'N/A'}`);
      lines.push(`    Pits: ${driver.pitStops || 0} | Tires: ${driver.compound || '?'} (${driver.tireAge || 0} laps)`);

      // Show recent performance trend
      if (driver.recentLaps && driver.recentLaps.length >= 2) {
        const recent = driver.recentLaps.slice(0, 3).map(l => l.time).join(', ');
        lines.push(`    Recent pace: ${recent}`);
      }
    });
    lines.push('');
  }

  // ML Predictions and Monte Carlo results
  if (mlPredictions) {
    lines.push(`**ML/MONTE CARLO PREDICTIONS**:`);
    lines.push(`  Methodology: ${mlPredictions.methodology.monteCarlo}`);
    lines.push(`  ML Models: ${mlPredictions.methodology.mlModels}`);
    lines.push(`  Analysis Inputs: ${mlPredictions.methodology.inputs}`);
    lines.push('');

    if (mlPredictions.topDecision) {
      lines.push(`  Top Decision: ${mlPredictions.topDecision.action || 'N/A'}`);
      lines.push(`  Confidence: ${mlPredictions.topDecision.confidence || 0}%`);
      if (mlPredictions.topDecision.expectedOutcome) {
        lines.push(`  Expected Outcome: ${mlPredictions.topDecision.expectedOutcome}`);
      }
    }

    if (mlPredictions.pitWindow) {
      lines.push(`  Optimal Pit Window: Lap ${mlPredictions.pitWindow.optimal || 'N/A'}`);
      if (mlPredictions.pitWindow.earliest && mlPredictions.pitWindow.latest) {
        lines.push(`  Pit Window Range: Lap ${mlPredictions.pitWindow.earliest}-${mlPredictions.pitWindow.latest}`);
      }
    }

    if (mlPredictions.risk) {
      lines.push(`  Risk Level: ${mlPredictions.risk.level || 'Unknown'}`);
      lines.push(`  Risk Score: ${mlPredictions.risk.score || 0}/100`);
    }

    if (mlPredictions.predictions) {
      if (mlPredictions.predictions.finalPosition) {
        lines.push(`  Predicted Final Position: P${mlPredictions.predictions.finalPosition.most_likely || '?'}`);
        if (mlPredictions.predictions.finalPosition.probability) {
          lines.push(`    Probability: ${mlPredictions.predictions.finalPosition.probability}%`);
        }
      }

      if (mlPredictions.predictions.nextLapTime) {
        lines.push(`  Predicted Next Lap: ${mlPredictions.predictions.nextLapTime}s`);
      }

      if (mlPredictions.predictions.raceWinner) {
        lines.push(`  Predicted Race Winner: ${mlPredictions.predictions.raceWinner.driver || 'Unknown'} (${mlPredictions.predictions.raceWinner.probability || 0}%)`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}
