/**
 * Optimized API endpoint for session data
 * Returns only essential data to avoid 4MB response size limit
 */

const { 
  loadSessionFromCache, 
  isSessionCached 
} = require('@monaco/utils/openf1FileCache');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionKey } = req.query;

  if (!sessionKey) {
    return res.status(400).json({ error: 'sessionKey is required' });
  }

  try {
    console.log(`[API OpenF1] Loading optimized session data for ${sessionKey}`);

    if (!isSessionCached(sessionKey)) {
      return res.status(404).json({ 
        error: 'Session not cached. Please load session first.' 
      });
    }

    // Load cached data
    const cachedData = loadSessionFromCache(sessionKey);
    
    if (!cachedData) {
      return res.status(404).json({ 
        error: 'Failed to load cached session data' 
      });
    }

    // Return ALL cached data - it's already loaded in memory
    // The 4MB issue was from OpenF1 API response, not from cached data
    const optimizedData = {
      sessionInfo: cachedData.sessionInfo,
      meeting: cachedData.meeting,
      drivers: cachedData.drivers,
      location: cachedData.location || [],
      carData: cachedData.carData || [],
      laps: cachedData.laps || [],
      positions: cachedData.positions || [],
      pitStops: cachedData.pitStops || [],
      stints: cachedData.stints || [],
      weather: cachedData.weather || [],
      raceControl: cachedData.raceControl || [],
      // Metadata for reference
      metadata: {
        totalLocationPoints: cachedData.location?.length || 0,
        totalCarDataPoints: cachedData.carData?.length || 0,
        totalLaps: cachedData.laps?.length || 0,
        totalPitStops: cachedData.pitStops?.length || 0,
        cacheTimestamp: cachedData.cacheTimestamp,
        note: 'Using full cached dataset'
      }
    };

    console.log(`[API OpenF1] ✓ Optimized session data loaded:`, {
      location: optimizedData.location.length,
      carData: optimizedData.carData.length,
      laps: optimizedData.laps.length,
      pitStops: optimizedData.pitStops.length
    });

    // Return data in the same format as the original endpoint (wrapped in 'data' property)
    return res.status(200).json({
      sessionKey,
      source: 'OpenF1 Cache (Optimized)',
      timestamp: new Date().toISOString(),
      data: optimizedData
    });

  } catch (error) {
    console.error(`[API OpenF1] Error:`, error);
    return res.status(500).json({
      error: 'Failed to load session data',
      details: error.message
    });
  }
}
