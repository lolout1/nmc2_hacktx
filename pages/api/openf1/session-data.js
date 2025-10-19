/**
 * API endpoint to fetch complete session data from OpenF1 API
 * Fetches all required data for replay: drivers, location, car data, laps, etc.
 * 
 * Uses file-based caching (CSV) to avoid refetching data and hitting rate limits
 */

const OPENF1_BASE_URL = 'https://api.openf1.org/v1';
const { 
  saveSessionToCache, 
  loadSessionFromCache, 
  isSessionCached 
} = require('@monaco/utils/openf1FileCache');

/**
 * Delay helper to avoid rate limiting
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch data from OpenF1 API with retry logic
 */
async function fetchOpenF1(endpoint, params = {}, retries = 3) {
  // Build URL with special handling for comparison operators
  // OpenF1 uses date>VALUE and date<VALUE (comparison operators in param name)
  let urlString = `${OPENF1_BASE_URL}/${endpoint}`;
  const queryParts = [];
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Check if this is a comparison operator parameter (contains < or >)
      if (key.includes('>') || key.includes('<')) {
        // Don't encode > and < - they're part of the parameter name for OpenF1 API
        // Just add the key as-is (value should be empty string for these)
        queryParts.push(key);
      } else if (value === '') {
        // Other empty values - just use the key
        queryParts.push(key);
      } else {
        // Normal key=value pairs
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }
  });
  
  if (queryParts.length > 0) {
    urlString += '?' + queryParts.join('&');
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`[API OpenF1] Fetching (attempt ${attempt + 1}/${retries + 1}): ${urlString}`);
      
      const response = await fetch(urlString, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.status === 429) {
        // Rate limited - wait longer before retry
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
        console.log(`[API OpenF1] Rate limited, waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
        continue;
      }

      if (!response.ok) {
        if (attempt < retries) {
          console.log(`[API OpenF1] Error ${response.status}, retrying...`);
          await delay(1000 * (attempt + 1));
          continue;
        }
        throw new Error(`OpenF1 API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[API OpenF1] ✓ Received ${data.length} items from ${endpoint}`);
      return data;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.log(`[API OpenF1] Attempt ${attempt + 1} failed, retrying...`);
      await delay(1000 * (attempt + 1));
    }
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionKey } = req.query;

    if (!sessionKey) {
      return res.status(400).json({ error: 'sessionKey is required' });
    }

    console.log(`[API OpenF1] Fetching complete session data for session_key=${sessionKey}`);

    // Check file cache first
    if (isSessionCached(sessionKey)) {
      console.log(`[API OpenF1] Loading session from file cache`);
      const cachedData = loadSessionFromCache(sessionKey);
      
      if (cachedData && cachedData.locationData.length > 0) {
        console.log(`[API OpenF1] Using cached data with ${cachedData.locationData.length} location points`);
        return res.status(200).json({
          sessionKey,
          source: 'File Cache (CSV)',
          timestamp: new Date().toISOString(),
          data: cachedData,
        });
      }
    }

    console.log(`[API OpenF1] No valid cache found, fetching from OpenF1 API...`);

    // Fetch session info first
    const [sessionInfo] = await fetchOpenF1('sessions', {
      session_key: sessionKey,
    });

    if (!sessionInfo) {
      return res.status(404).json({ 
        error: 'Session not found',
        sessionKey,
      });
    }

    // Fetch data sequentially to avoid rate limiting
    // Critical data first
    console.log('[API OpenF1] Fetching critical data...');
    const drivers = await fetchOpenF1('drivers', { session_key: sessionKey });
    await delay(500); // Wait between requests
    
    const meeting = await fetchOpenF1('meetings', { meeting_key: sessionInfo.meeting_key });
    await delay(500);
    
    const positions = await fetchOpenF1('position', { session_key: sessionKey });
    await delay(500);
    
    const laps = await fetchOpenF1('laps', { session_key: sessionKey });
    await delay(500);
    
    // Location data for map visualization
    // OpenF1 requires date filters for location data to avoid 422 errors
    console.log('[API OpenF1] Fetching location data with date filters...');
    const locationData = [];
    
    // Get session time range from sessionInfo
    const sessionStart = new Date(sessionInfo.date_start);
    const sessionEnd = new Date(sessionInfo.date_end);
    
    // Fetch location data in 5-minute chunks to avoid rate limits and timeouts
    const chunkSizeMs = 5 * 60 * 1000; // 5 minutes
    let currentStart = sessionStart;
    
    while (currentStart < sessionEnd) {
      const currentEnd = new Date(Math.min(currentStart.getTime() + chunkSizeMs, sessionEnd.getTime()));
      
      try {
        // OpenF1 API uses comparison operators in parameter names: date>value and date<value
        const params = {
          session_key: sessionKey,
        };
        params[`date>${currentStart.toISOString()}`] = '';
        params[`date<${currentEnd.toISOString()}`] = '';
        
        console.log(`[API OpenF1] Requesting location data with params:`, params);
        const chunk = await fetchOpenF1('location', params);
        
        if (chunk && chunk.length > 0) {
          locationData.push(...chunk);
          console.log(`[API OpenF1] ✓ Fetched ${chunk.length} location points (total: ${locationData.length})`);
        } else {
          console.warn(`[API OpenF1] No location data in this time range`);
        }
        
        await delay(500); // Rate limit protection
      } catch (err) {
        console.error(`[API OpenF1] Location chunk failed for ${currentStart.toISOString()}:`, err.message);
      }
      
      currentStart = currentEnd;
    }
    
    console.log(`[API OpenF1] Total location data points: ${locationData.length}`);
    
    // Car data (telemetry: gear, RPM, speed, throttle, brake, DRS)
    // Fetch in chunks like location data to avoid rate limits
    console.log('[API OpenF1] Fetching car data (telemetry - chunked)...');
    const carData = [];
    currentStart = sessionStart; // Reset to session start
    
    while (currentStart < sessionEnd) {
      const currentEnd = new Date(Math.min(currentStart.getTime() + chunkSizeMs, sessionEnd.getTime()));
      
      try {
        const params = {
          session_key: sessionKey,
        };
        params[`date>${currentStart.toISOString()}`] = '';
        params[`date<${currentEnd.toISOString()}`] = '';
        
        const chunk = await fetchOpenF1('car_data', params).catch(err => {
          console.warn(`[API OpenF1] Car data chunk failed: ${err.message}`);
          return [];
        });
        
        if (chunk && chunk.length > 0) {
          carData.push(...chunk);
          console.log(`[API OpenF1] ✓ Fetched ${chunk.length} car data points (total: ${carData.length})`);
        }
        
        await delay(500); // Rate limit protection
      } catch (err) {
        console.error(`[API OpenF1] Car data chunk failed for ${currentStart.toISOString()}:`, err.message);
      }
      
      currentStart = currentEnd;
    }
    
    console.log(`[API OpenF1] Total car data points: ${carData.length}`);
    
    // Optional data
    console.log('[API OpenF1] Fetching optional data...');
    const pitStops = await fetchOpenF1('pit', { session_key: sessionKey }).catch(() => []);
    await delay(500);
    
    const raceControl = await fetchOpenF1('race_control', { session_key: sessionKey }).catch(() => []);
    await delay(500);
    
    const weather = await fetchOpenF1('weather', { session_key: sessionKey }).catch(() => []);
    await delay(500);
    
    const intervals = await fetchOpenF1('intervals', { session_key: sessionKey }).catch(() => []);

    console.log(`[API OpenF1] Data summary:`, {
      drivers: drivers.length,
      locationData: locationData.length,
      carData: carData.length,
      laps: laps.length,
      positions: positions.length,
      pitStops: pitStops.length,
      raceControl: raceControl.length,
      intervals: intervals.length,
      weather: weather.length,
    });

    // Prepare session data
    const sessionData = {
      sessionInfo,
      meeting: meeting[0],
      drivers,
      locationData,
      carData,
      laps,
      positions,
      pitStops,
      raceControl,
      intervals,
      weather,
    };

    // Save to file cache (will deduplicate location data)
    try {
      saveSessionToCache(sessionKey, sessionData);
    } catch (cacheError) {
      console.error('[API OpenF1] Error saving to cache:', cacheError.message);
      // Continue even if caching fails
    }

    // Return data in a format compatible with the replay engine
    return res.status(200).json({
      sessionKey,
      source: 'OpenF1 API (Fresh)',
      timestamp: new Date().toISOString(),
      data: sessionData,
    });
  } catch (error) {
    console.error('[API OpenF1] Error fetching session data:', error);
    return res.status(500).json({
      error: 'Failed to fetch session data',
      message: error.message,
    });
  }
}

