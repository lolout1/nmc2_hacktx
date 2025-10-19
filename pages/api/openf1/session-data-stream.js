/**
 * Streaming API endpoint for large session data
 * Returns data in chunks to avoid 4MB limit
 * 
 * Usage:
 * - /api/openf1/session-data-stream?sessionKey=9161&dataType=location&offset=0&limit=5000
 * - /api/openf1/session-data-stream?sessionKey=9161&dataType=carData&offset=0&limit=5000
 */

const { loadSessionFromCache, isSessionCached } = require('@monaco/utils/openf1FileCache');

export const config = {
  api: {
    responseLimit: false, // Disable response size limit for streaming
  },
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionKey, dataType, offset = 0, limit = 5000 } = req.query;

  if (!sessionKey) {
    return res.status(400).json({ error: 'sessionKey is required' });
  }

  if (!dataType) {
    return res.status(400).json({ 
      error: 'dataType is required',
      validTypes: ['location', 'carData', 'laps', 'positions', 'pitStops', 'weather', 'raceControl']
    });
  }

  try {
    console.log(`[API Stream] Loading ${dataType} for session ${sessionKey} (offset: ${offset}, limit: ${limit})`);

    if (!isSessionCached(sessionKey)) {
      return res.status(404).json({ 
        error: 'Session not cached. Please load session first.' 
      });
    }

    const cachedData = loadSessionFromCache(sessionKey);
    
    if (!cachedData) {
      return res.status(404).json({ 
        error: 'Failed to load cached session data' 
      });
    }

    // Convert offset and limit to numbers
    const offsetNum = parseInt(offset);
    const limitNum = parseInt(limit);
    
    let data, total;
    
    // Return paginated data based on type
    switch(dataType) {
      case 'location':
        data = cachedData.location?.slice(offsetNum, offsetNum + limitNum) || [];
        total = cachedData.location?.length || 0;
        break;
        
      case 'carData':
        data = cachedData.carData?.slice(offsetNum, offsetNum + limitNum) || [];
        total = cachedData.carData?.length || 0;
        break;
        
      case 'laps':
        data = cachedData.laps?.slice(offsetNum, offsetNum + limitNum) || [];
        total = cachedData.laps?.length || 0;
        break;
        
      case 'positions':
        data = cachedData.positions?.slice(offsetNum, offsetNum + limitNum) || [];
        total = cachedData.positions?.length || 0;
        break;
        
      case 'pitStops':
        data = cachedData.pitStops?.slice(offsetNum, offsetNum + limitNum) || [];
        total = cachedData.pitStops?.length || 0;
        break;
        
      case 'weather':
        data = cachedData.weather?.slice(offsetNum, offsetNum + limitNum) || [];
        total = cachedData.weather?.length || 0;
        break;
        
      case 'raceControl':
        data = cachedData.raceControl?.slice(offsetNum, offsetNum + limitNum) || [];
        total = cachedData.raceControl?.length || 0;
        break;
        
      default:
        return res.status(400).json({ 
          error: 'Invalid dataType',
          validTypes: ['location', 'carData', 'laps', 'positions', 'pitStops', 'weather', 'raceControl']
        });
    }

    const hasMore = (offsetNum + limitNum) < total;
    const nextOffset = hasMore ? offsetNum + limitNum : null;

    console.log(`[API Stream] ✓ Returning ${data.length} of ${total} ${dataType} records`);

    return res.status(200).json({
      data,
      metadata: {
        sessionKey,
        dataType,
        offset: offsetNum,
        limit: limitNum,
        returned: data.length,
        total,
        hasMore,
        nextOffset,
        percentComplete: total > 0 ? ((offsetNum + data.length) / total * 100).toFixed(1) : 100
      }
    });

  } catch (error) {
    console.error(`[API Stream] Error:`, error);
    return res.status(500).json({
      error: 'Failed to load session data',
      details: error.message
    });
  }
}

