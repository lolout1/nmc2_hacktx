/**
 * Fetch and Cache Historical Race Data
 *
 * Fetches race data from OpenF1 API and caches it
 */

import { cacheRaceSession, isSessionCached } from '../../../utils/raceDataCache';

const OPENF1_BASE = 'https://api.openf1.org/v1';

/**
 * Fetch session data from OpenF1 API
 */
async function fetchOpenF1SessionData(sessionKey) {
  console.log(`[Historical] Fetching session ${sessionKey} from OpenF1...`);

  try {
    // Fetch session info
    const sessionRes = await fetch(`${OPENF1_BASE}/sessions?session_key=${sessionKey}`);
    if (!sessionRes.ok) throw new Error(`Session API error: ${sessionRes.status}`);
    const sessions = await sessionRes.json();
    const sessionInfo = sessions[0];

    if (!sessionInfo) {
      throw new Error('Session not found');
    }

    console.log(`[Historical] Session: ${sessionInfo.session_name} - ${sessionInfo.meeting.official_name}`);

    // Fetch drivers
    const driversRes = await fetch(`${OPENF1_BASE}/drivers?session_key=${sessionKey}`);
    if (!driversRes.ok) throw new Error(`Drivers API error: ${driversRes.status}`);
    const driversData = await driversRes.json();

    // Convert drivers to DriverList format
    const driverList = {};
    driversData.forEach(driver => {
      driverList[driver.driver_number] = {
        BroadcastName: driver.broadcast_name || driver.full_name,
        FullName: driver.full_name,
        Abbreviation: driver.name_acronym,
        TeamName: driver.team_name,
        TeamColour: driver.team_colour,
        HeadshotUrl: driver.headshot_url,
        CountryCode: driver.country_code
      };
    });

    console.log(`[Historical] Loaded ${Object.keys(driverList).length} drivers`);

    // Fetch lap data for timing information
    const lapsRes = await fetch(`${OPENF1_BASE}/laps?session_key=${sessionKey}`);
    if (!lapsRes.ok) throw new Error(`Laps API error: ${lapsRes.status}`);
    const lapsData = await lapsRes.json();

    // Build timing data from laps
    const timingData = { Lines: {} };

    // Group laps by driver
    const driverLaps = {};
    lapsData.forEach(lap => {
      const driverNum = String(lap.driver_number);
      if (!driverLaps[driverNum]) {
        driverLaps[driverNum] = [];
      }
      driverLaps[driverNum].push(lap);
    });

    // Process each driver's laps
    Object.entries(driverLaps).forEach(([driverNum, laps]) => {
      // Sort by lap number
      laps.sort((a, b) => a.lap_number - b.lap_number);

      const lastLap = laps[laps.length - 1];
      const bestLap = laps.reduce((best, lap) =>
        (lap.lap_duration && (!best.lap_duration || lap.lap_duration < best.lap_duration)) ? lap : best
        , laps[0]);

      timingData.Lines[driverNum] = {
        Position: lastLap.position || undefined,
        LastLapTime: { Value: lastLap.lap_duration ? `${lastLap.lap_duration.toFixed(3)}` : undefined },
        BestLapTime: { Value: bestLap.lap_duration ? `${bestLap.lap_duration.toFixed(3)}` : undefined },
        GapToLeader: lastLap.gap_to_leader !== null ? `${lastLap.gap_to_leader.toFixed(3)}` : undefined,
        IntervalToPositionAhead: { Value: lastLap.interval ? `${lastLap.interval.toFixed(3)}` : undefined },
        NumberOfLaps: laps.length,
        InPit: lastLap.is_pit_out_lap || false,
        NumberOfPitStops: laps.filter(l => l.is_pit_out_lap).length,
        Stint: {
          Compound: lastLap.compound || undefined,
          TotalLaps: lastLap.stint ? laps.filter(l => l.stint === lastLap.stint).length : 0
        }
      };
    });

    console.log(`[Historical] Built timing data for ${Object.keys(timingData.Lines).length} drivers`);

    // Fetch weather data
    let weatherData = null;
    try {
      const weatherRes = await fetch(`${OPENF1_BASE}/weather?session_key=${sessionKey}`);
      if (weatherRes.ok) {
        const weatherArr = await weatherRes.json();
        if (weatherArr.length > 0) {
          const weather = weatherArr[weatherArr.length - 1]; // Get latest weather
          weatherData = {
            AirTemp: weather.air_temperature,
            TrackTemp: weather.track_temperature,
            Humidity: weather.humidity,
            Pressure: weather.pressure,
            WindSpeed: weather.wind_speed,
            WindDirection: weather.wind_direction,
            Rainfall: weather.rainfall > 0
          };
        }
      }
    } catch (err) {
      console.warn('[Historical] Weather data not available:', err.message);
    }

    // Build session data
    const sessionData = {
      Name: sessionInfo.session_name,
      Type: sessionInfo.session_type,
      StartDate: sessionInfo.date_start,
      EndDate: sessionInfo.date_end,
      Year: sessionInfo.year,
      session_key: sessionKey,
      Meeting: {
        OfficialName: sessionInfo.meeting.official_name,
        Circuit: {
          ShortName: sessionInfo.meeting.circuit_short_name,
          Key: sessionInfo.meeting.circuit_key
        },
        Country: {
          Name: sessionInfo.meeting.country_name,
          Code: sessionInfo.meeting.country_code
        }
      }
    };

    return {
      sessionData,
      timingData,
      driverList,
      weatherData
    };

  } catch (error) {
    console.error(`[Historical] Failed to fetch session ${sessionKey}:`, error);
    throw error;
  }
}

/**
 * API Handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionKey, force = false } = req.body;

  if (!sessionKey) {
    return res.status(400).json({
      error: 'sessionKey is required'
    });
  }

  try {
    // Check if already cached
    if (!force && isSessionCached(sessionKey)) {
      console.log(`[Historical] Session ${sessionKey} already cached`);
      return res.status(200).json({
        success: true,
        cached: true,
        sessionKey,
        message: 'Session already cached'
      });
    }

    // Fetch from OpenF1
    const raceData = await fetchOpenF1SessionData(sessionKey);

    // Cache the data
    const success = cacheRaceSession(sessionKey, raceData);

    if (success) {
      return res.status(200).json({
        success: true,
        cached: false,
        sessionKey,
        message: 'Session fetched and cached successfully',
        sessionName: raceData.sessionData.Name,
        meetingName: raceData.sessionData.Meeting.OfficialName,
        drivers: Object.keys(raceData.driverList).length
      });
    } else {
      throw new Error('Failed to cache session data');
    }

  } catch (error) {
    console.error('[Historical] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch and cache session',
      details: error.message,
      sessionKey
    });
  }
}
