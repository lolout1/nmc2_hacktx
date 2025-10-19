/**
 * Race Session Cache Management API
 *
 * Endpoints:
 * - GET: List all cached sessions
 * - POST: Cache a new session
 * - DELETE: Delete a cached session
 */

import {
  initializeCacheDirectory,
  cacheRaceSession,
  loadCachedRaceSession,
  listCachedSessions,
  isSessionCached,
  deleteCachedSession,
  clearCache,
  getCacheStats
} from '../../../utils/raceDataCache';

export default async function handler(req, res) {
  // Initialize cache directory
  initializeCacheDirectory();

  if (req.method === 'GET') {
    const { action, sessionKey } = req.query;

    try {
      // Get cache stats
      if (action === 'stats') {
        const stats = getCacheStats();
        return res.status(200).json(stats);
      }

      // Load specific session
      if (action === 'load' && sessionKey) {
        const raceData = loadCachedRaceSession(sessionKey);

        if (!raceData) {
          return res.status(404).json({
            error: 'Session not found',
            sessionKey
          });
        }

        return res.status(200).json({
          success: true,
          sessionKey,
          data: raceData
        });
      }

      // Check if session is cached
      if (action === 'check' && sessionKey) {
        const cached = isSessionCached(sessionKey);
        return res.status(200).json({
          sessionKey,
          cached
        });
      }

      // List all cached sessions (default)
      const list = listCachedSessions();
      return res.status(200).json(list);

    } catch (error) {
      console.error('[Cache API] GET error:', error);
      return res.status(500).json({
        error: 'Failed to process request',
        details: error.message
      });
    }
  }

  if (req.method === 'POST') {
    const { sessionKey, raceData, action } = req.body;

    try {
      // Clear all cache
      if (action === 'clear') {
        const success = clearCache();
        return res.status(200).json({
          success,
          message: success ? 'Cache cleared successfully' : 'Failed to clear cache'
        });
      }

      // Cache new session
      if (!sessionKey || !raceData) {
        return res.status(400).json({
          error: 'sessionKey and raceData are required'
        });
      }

      const success = cacheRaceSession(sessionKey, raceData);

      if (success) {
        return res.status(200).json({
          success: true,
          sessionKey,
          message: 'Session cached successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to cache session'
        });
      }

    } catch (error) {
      console.error('[Cache API] POST error:', error);
      return res.status(500).json({
        error: 'Failed to cache session',
        details: error.message
      });
    }
  }

  if (req.method === 'DELETE') {
    const { sessionKey, action } = req.body;

    try {
      // Clear all cache
      if (action === 'clear-all') {
        const success = clearCache();
        return res.status(200).json({
          success,
          message: success ? 'All cache cleared' : 'Failed to clear cache'
        });
      }

      // Delete specific session
      if (!sessionKey) {
        return res.status(400).json({
          error: 'sessionKey is required'
        });
      }

      const success = deleteCachedSession(sessionKey);

      if (success) {
        return res.status(200).json({
          success: true,
          sessionKey,
          message: 'Session deleted successfully'
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Session not found or failed to delete'
        });
      }

    } catch (error) {
      console.error('[Cache API] DELETE error:', error);
      return res.status(500).json({
        error: 'Failed to delete session',
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
