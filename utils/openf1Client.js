/**
 * OpenF1 API Client
 * Provides functions to fetch F1 data from api.openf1.org
 * 
 * For replay functionality, we fetch:
 * - Session metadata (meetings, sessions)
 * - Car data (telemetry: speed, RPM, throttle, brake, gear, DRS)
 * - Location data (X, Y, Z coordinates for track position)
 * - Driver information (names, teams, colors)
 * - Laps data (lap times, sector times)
 * - Position data (race positions over time)
 */

const OPENF1_BASE_URL = 'https://api.openf1.org/v1';

/**
 * Fetch data from OpenF1 API with query parameters
 * @param {string} endpoint - API endpoint (e.g., 'car_data', 'location')
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} - Array of data objects
 */
async function fetchOpenF1(endpoint, params = {}) {
  const url = new URL(`${OPENF1_BASE_URL}/${endpoint}`);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  console.log(`[OpenF1] Fetching: ${url.toString()}`);
  
  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenF1 API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[OpenF1] Received ${data.length} items from ${endpoint}`);
    return data;
  } catch (error) {
    console.error(`[OpenF1] Error fetching ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Get a specific historical session (2023 Singapore Grand Prix Race)
 * This is our default session for replay functionality
 * @returns {Promise<Object>} Session metadata
 */
export async function getDefaultSession() {
  // Singapore Grand Prix 2023 Race - session_key=9165
  const sessions = await fetchOpenF1('sessions', {
    session_key: 9165,
  });

  if (sessions.length === 0) {
    throw new Error('Default session not found');
  }

  return sessions[0];
}

/**
 * Get all drivers for a session
 * @param {number} sessionKey - Session key
 * @returns {Promise<Array>} Array of driver objects
 */
export async function getDrivers(sessionKey) {
  return fetchOpenF1('drivers', {
    session_key: sessionKey,
  });
}

/**
 * Get location data for all drivers in a session
 * Location data provides X, Y, Z coordinates at ~3.7 Hz
 * @param {number} sessionKey - Session key
 * @param {number} driverNumber - Optional: specific driver number
 * @returns {Promise<Array>} Array of location objects
 */
export async function getLocationData(sessionKey, driverNumber = null) {
  const params = { session_key: sessionKey };
  if (driverNumber) {
    params.driver_number = driverNumber;
  }
  return fetchOpenF1('location', params);
}

/**
 * Get car data (telemetry) for a session
 * Includes: speed, RPM, throttle, brake, gear, DRS at ~3.7 Hz
 * @param {number} sessionKey - Session key
 * @param {number} driverNumber - Optional: specific driver number
 * @returns {Promise<Array>} Array of car data objects
 */
export async function getCarData(sessionKey, driverNumber = null) {
  const params = { session_key: sessionKey };
  if (driverNumber) {
    params.driver_number = driverNumber;
  }
  return fetchOpenF1('car_data', params);
}

/**
 * Get lap data for a session
 * @param {number} sessionKey - Session key
 * @param {number} driverNumber - Optional: specific driver number
 * @returns {Promise<Array>} Array of lap objects
 */
export async function getLaps(sessionKey, driverNumber = null) {
  const params = { session_key: sessionKey };
  if (driverNumber) {
    params.driver_number = driverNumber;
  }
  return fetchOpenF1('laps', params);
}

/**
 * Get position data for a session (race positions over time)
 * @param {number} sessionKey - Session key
 * @returns {Promise<Array>} Array of position objects
 */
export async function getPositions(sessionKey) {
  return fetchOpenF1('position', {
    session_key: sessionKey,
  });
}

/**
 * Get race control messages for a session
 * @param {number} sessionKey - Session key
 * @returns {Promise<Array>} Array of race control message objects
 */
export async function getRaceControl(sessionKey) {
  return fetchOpenF1('race_control', {
    session_key: sessionKey,
  });
}

/**
 * Get intervals data (gaps between drivers)
 * @param {number} sessionKey - Session key
 * @returns {Promise<Array>} Array of interval objects
 */
export async function getIntervals(sessionKey) {
  return fetchOpenF1('intervals', {
    session_key: sessionKey,
  });
}

/**
 * Get weather data for a session
 * @param {number} sessionKey - Session key
 * @returns {Promise<Array>} Array of weather objects
 */
export async function getWeather(sessionKey) {
  return fetchOpenF1('weather', {
    session_key: sessionKey,
  });
}

/**
 * Get meeting (Grand Prix) information
 * @param {number} meetingKey - Meeting key
 * @returns {Promise<Array>} Array of meeting objects
 */
export async function getMeeting(meetingKey) {
  return fetchOpenF1('meetings', {
    meeting_key: meetingKey,
  });
}

/**
 * Get sessions for a specific meeting
 * @param {number} meetingKey - Meeting key
 * @returns {Promise<Array>} Array of session objects
 */
export async function getSessionsForMeeting(meetingKey) {
  return fetchOpenF1('sessions', {
    meeting_key: meetingKey,
  });
}

/**
 * Fetch all data required for replay of a session
 * This is optimized to fetch data in parallel
 * @param {number} sessionKey - Session key
 * @returns {Promise<Object>} Complete session data for replay
 */
export async function getCompleteSessionData(sessionKey) {
  console.log(`[OpenF1] Fetching complete session data for session_key=${sessionKey}`);
  
  try {
    // Fetch session metadata first to get meeting info
    const [sessionInfo] = await fetchOpenF1('sessions', {
      session_key: sessionKey,
    });

    if (!sessionInfo) {
      throw new Error(`Session ${sessionKey} not found`);
    }

    // Fetch all data in parallel for performance
    const [
      drivers,
      locationData,
      carData,
      laps,
      positions,
      raceControl,
      intervals,
      weather,
      meeting,
    ] = await Promise.all([
      getDrivers(sessionKey),
      getLocationData(sessionKey),
      getCarData(sessionKey),
      getLaps(sessionKey),
      getPositions(sessionKey),
      getRaceControl(sessionKey).catch(() => []), // Optional data
      getIntervals(sessionKey).catch(() => []),   // Optional data
      getWeather(sessionKey).catch(() => []),     // Optional data
      getMeeting(sessionInfo.meeting_key),
    ]);

    console.log(`[OpenF1] Data fetched:`, {
      drivers: drivers.length,
      locationData: locationData.length,
      carData: carData.length,
      laps: laps.length,
      positions: positions.length,
      raceControl: raceControl.length,
      intervals: intervals.length,
      weather: weather.length,
    });

    return {
      sessionInfo,
      meeting: meeting[0],
      drivers,
      locationData,
      carData,
      laps,
      positions,
      raceControl,
      intervals,
      weather,
    };
  } catch (error) {
    console.error('[OpenF1] Error fetching complete session data:', error);
    throw error;
  }
}

export default {
  getDefaultSession,
  getDrivers,
  getLocationData,
  getCarData,
  getLaps,
  getPositions,
  getRaceControl,
  getIntervals,
  getWeather,
  getMeeting,
  getSessionsForMeeting,
  getCompleteSessionData,
};

