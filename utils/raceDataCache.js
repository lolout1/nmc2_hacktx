/**
 * Race Data Cache System
 *
 * Manages multiple race sessions with CSV export/import
 * Provides robust caching with automatic persistence
 */

import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'cache', 'races');
const INDEX_FILE = path.join(CACHE_DIR, 'index.json');
const MAX_CACHE_SIZE_MB = 500; // Maximum cache size in MB

/**
 * Initialize cache directory structure
 */
export function initializeCacheDirectory() {
  try {
    // Create cache directory if it doesn't exist
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      console.log('[Cache] Created cache directory:', CACHE_DIR);
    }

    // Create index file if it doesn't exist
    if (!fs.existsSync(INDEX_FILE)) {
      const initialIndex = {
        version: '1.0',
        sessions: {},
        lastUpdated: new Date().toISOString(),
        totalSizeBytes: 0
      };
      fs.writeFileSync(INDEX_FILE, JSON.stringify(initialIndex, null, 2));
      console.log('[Cache] Created index file');
    }

    return true;
  } catch (error) {
    console.error('[Cache] Failed to initialize cache directory:', error);
    return false;
  }
}

/**
 * Load cache index
 */
function loadIndex() {
  try {
    initializeCacheDirectory();
    const data = fs.readFileSync(INDEX_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[Cache] Failed to load index:', error);
    return {
      version: '1.0',
      sessions: {},
      lastUpdated: new Date().toISOString(),
      totalSizeBytes: 0
    };
  }
}

/**
 * Save cache index
 */
function saveIndex(index) {
  try {
    index.lastUpdated = new Date().toISOString();
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    return true;
  } catch (error) {
    console.error('[Cache] Failed to save index:', error);
    return false;
  }
}

/**
 * Generate session metadata
 */
function generateSessionMetadata(sessionKey, sessionData) {
  return {
    sessionKey: sessionKey,
    sessionName: sessionData?.Name || sessionData?.name || 'Unknown Session',
    sessionType: sessionData?.Type || sessionData?.type || 'Unknown',
    meetingName: sessionData?.Meeting?.OfficialName || sessionData?.meeting?.name || 'Unknown Meeting',
    circuitName: sessionData?.Meeting?.Circuit?.ShortName || sessionData?.circuit?.name || 'Unknown Circuit',
    country: sessionData?.Meeting?.Country?.Name || sessionData?.country || 'Unknown',
    startDate: sessionData?.StartDate || sessionData?.start_date,
    endDate: sessionData?.EndDate || sessionData?.end_date,
    year: sessionData?.Year || sessionData?.year || new Date().getFullYear(),
    cached: new Date().toISOString()
  };
}

/**
 * Convert race data to CSV format
 */
function convertToCSV(data, dataType) {
  const rows = [];

  switch (dataType) {
    case 'timing':
      // Timing data CSV
      rows.push('DriverNumber,Position,LastLapTime,BestLapTime,GapToLeader,IntervalAhead,NumberOfLaps,InPit,PitStops,TireCompound,TireAge');

      if (data?.Lines) {
        Object.entries(data.Lines).forEach(([driverNum, line]) => {
          rows.push([
            driverNum,
            line.Position || '',
            line.LastLapTime?.Value || '',
            line.BestLapTime?.Value || '',
            line.GapToLeader || '',
            line.IntervalToPositionAhead?.Value || '',
            line.NumberOfLaps || '',
            line.InPit ? '1' : '0',
            line.NumberOfPitStops || '0',
            line.Stint?.Compound || '',
            line.Stint?.TotalLaps || ''
          ].join(','));
        });
      }
      break;

    case 'drivers':
      // Driver list CSV
      rows.push('DriverNumber,BroadcastName,FullName,Abbreviation,TeamName,TeamColour,HeadshotUrl,CountryCode');

      if (data) {
        Object.entries(data).forEach(([driverNum, driver]) => {
          rows.push([
            driverNum,
            driver.BroadcastName || '',
            driver.FullName || '',
            driver.Abbreviation || '',
            driver.TeamName || '',
            driver.TeamColour || '',
            driver.HeadshotUrl || '',
            driver.CountryCode || ''
          ].join(','));
        });
      }
      break;

    case 'weather':
      // Weather data CSV
      rows.push('AirTemp,TrackTemp,Humidity,Pressure,WindSpeed,WindDirection,Rainfall');
      rows.push([
        data?.AirTemp || '',
        data?.TrackTemp || '',
        data?.Humidity || '',
        data?.Pressure || '',
        data?.WindSpeed || '',
        data?.WindDirection || '',
        data?.Rainfall ? '1' : '0'
      ].join(','));
      break;

    case 'session':
      // Session info CSV
      rows.push('Field,Value');
      rows.push(`Name,${data?.Name || data?.name || ''}`);
      rows.push(`Type,${data?.Type || data?.type || ''}`);
      rows.push(`StartDate,${data?.StartDate || data?.start_date || ''}`);
      rows.push(`EndDate,${data?.EndDate || data?.end_date || ''}`);
      rows.push(`Circuit,${data?.Meeting?.Circuit?.ShortName || ''}`);
      rows.push(`Country,${data?.Meeting?.Country?.Name || ''}`);
      rows.push(`MeetingName,${data?.Meeting?.OfficialName || ''}`);
      break;

    default:
      console.warn('[Cache] Unknown data type:', dataType);
      return '';
  }

  return rows.join('\n');
}

/**
 * Parse CSV to race data
 */
function parseCSV(csvContent, dataType) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return null;

  const headers = lines[0].split(',');
  const data = {};

  switch (dataType) {
    case 'timing':
      const timingData = { Lines: {} };

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const driverNum = values[0];

        timingData.Lines[driverNum] = {
          Position: values[1] || undefined,
          LastLapTime: { Value: values[2] || undefined },
          BestLapTime: { Value: values[3] || undefined },
          GapToLeader: values[4] || undefined,
          IntervalToPositionAhead: { Value: values[5] || undefined },
          NumberOfLaps: parseInt(values[6]) || 0,
          InPit: values[7] === '1',
          NumberOfPitStops: parseInt(values[8]) || 0,
          Stint: {
            Compound: values[9] || undefined,
            TotalLaps: parseInt(values[10]) || 0
          }
        };
      }

      return timingData;

    case 'drivers':
      const driverList = {};

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const driverNum = values[0];

        driverList[driverNum] = {
          BroadcastName: values[1] || undefined,
          FullName: values[2] || undefined,
          Abbreviation: values[3] || undefined,
          TeamName: values[4] || undefined,
          TeamColour: values[5] || undefined,
          HeadshotUrl: values[6] || undefined,
          CountryCode: values[7] || undefined
        };
      }

      return driverList;

    case 'weather':
      if (lines.length < 2) return null;

      const weatherValues = lines[1].split(',');
      return {
        AirTemp: parseFloat(weatherValues[0]) || undefined,
        TrackTemp: parseFloat(weatherValues[1]) || undefined,
        Humidity: parseFloat(weatherValues[2]) || undefined,
        Pressure: parseFloat(weatherValues[3]) || undefined,
        WindSpeed: parseFloat(weatherValues[4]) || undefined,
        WindDirection: parseInt(weatherValues[5]) || undefined,
        Rainfall: weatherValues[6] === '1'
      };

    case 'session':
      const sessionData = {};

      for (let i = 1; i < lines.length; i++) {
        const [field, value] = lines[i].split(',');
        sessionData[field] = value;
      }

      return {
        Name: sessionData.Name,
        Type: sessionData.Type,
        StartDate: sessionData.StartDate,
        EndDate: sessionData.EndDate,
        Meeting: {
          Circuit: { ShortName: sessionData.Circuit },
          Country: { Name: sessionData.Country },
          OfficialName: sessionData.MeetingName
        }
      };

    default:
      return null;
  }
}

/**
 * Cache race session data
 */
export function cacheRaceSession(sessionKey, raceData) {
  try {
    console.log(`[Cache] Caching session ${sessionKey}...`);

    const index = loadIndex();
    const sessionDir = path.join(CACHE_DIR, `session_${sessionKey}`);

    // Create session directory
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Save each data type as CSV
    const files = {};
    let totalSize = 0;

    // Timing data
    if (raceData.timingData || raceData.TimingData) {
      const csv = convertToCSV(raceData.timingData || raceData.TimingData, 'timing');
      const filePath = path.join(sessionDir, 'timing.csv');
      fs.writeFileSync(filePath, csv);
      files.timing = 'timing.csv';
      totalSize += csv.length;
    }

    // Driver list
    if (raceData.driverList || raceData.DriverList) {
      const csv = convertToCSV(raceData.driverList || raceData.DriverList, 'drivers');
      const filePath = path.join(sessionDir, 'drivers.csv');
      fs.writeFileSync(filePath, csv);
      files.drivers = 'drivers.csv';
      totalSize += csv.length;
    }

    // Weather data
    if (raceData.weatherData || raceData.WeatherData) {
      const csv = convertToCSV(raceData.weatherData || raceData.WeatherData, 'weather');
      const filePath = path.join(sessionDir, 'weather.csv');
      fs.writeFileSync(filePath, csv);
      files.weather = 'weather.csv';
      totalSize += csv.length;
    }

    // Session info
    if (raceData.sessionData || raceData.SessionInfo) {
      const sessionData = raceData.sessionData || raceData.SessionInfo;
      const csv = convertToCSV(sessionData, 'session');
      const filePath = path.join(sessionDir, 'session.csv');
      fs.writeFileSync(filePath, csv);
      files.session = 'session.csv';
      totalSize += csv.length;

      // Update index
      index.sessions[sessionKey] = {
        ...generateSessionMetadata(sessionKey, sessionData),
        files: files,
        sizeBytes: totalSize
      };
    }

    // Update total cache size
    index.totalSizeBytes = Object.values(index.sessions).reduce(
      (sum, session) => sum + (session.sizeBytes || 0),
      0
    );

    // Check cache size limit
    const cacheSizeMB = index.totalSizeBytes / (1024 * 1024);
    if (cacheSizeMB > MAX_CACHE_SIZE_MB) {
      console.warn(`[Cache] Cache size (${cacheSizeMB.toFixed(2)}MB) exceeds limit (${MAX_CACHE_SIZE_MB}MB)`);
      // TODO: Implement LRU eviction
    }

    saveIndex(index);

    console.log(`[Cache] ✓ Cached session ${sessionKey} (${(totalSize / 1024).toFixed(2)}KB)`);
    return true;
  } catch (error) {
    console.error(`[Cache] Failed to cache session ${sessionKey}:`, error);
    return false;
  }
}

/**
 * Load race session from cache
 */
export function loadCachedRaceSession(sessionKey) {
  try {
    console.log(`[Cache] Loading session ${sessionKey}...`);

    const index = loadIndex();
    const sessionMeta = index.sessions[sessionKey];

    if (!sessionMeta) {
      console.log(`[Cache] Session ${sessionKey} not found in cache`);
      return null;
    }

    const sessionDir = path.join(CACHE_DIR, `session_${sessionKey}`);

    if (!fs.existsSync(sessionDir)) {
      console.warn(`[Cache] Session directory not found: ${sessionDir}`);
      return null;
    }

    const raceData = {};

    // Load timing data
    if (sessionMeta.files.timing) {
      const csv = fs.readFileSync(path.join(sessionDir, sessionMeta.files.timing), 'utf8');
      raceData.timingData = parseCSV(csv, 'timing');
    }

    // Load driver list
    if (sessionMeta.files.drivers) {
      const csv = fs.readFileSync(path.join(sessionDir, sessionMeta.files.drivers), 'utf8');
      raceData.driverList = parseCSV(csv, 'drivers');
    }

    // Load weather data
    if (sessionMeta.files.weather) {
      const csv = fs.readFileSync(path.join(sessionDir, sessionMeta.files.weather), 'utf8');
      raceData.weatherData = parseCSV(csv, 'weather');
    }

    // Load session info
    if (sessionMeta.files.session) {
      const csv = fs.readFileSync(path.join(sessionDir, sessionMeta.files.session), 'utf8');
      raceData.sessionData = parseCSV(csv, 'session');
    }

    // Add metadata
    raceData.metadata = sessionMeta;

    console.log(`[Cache] ✓ Loaded session ${sessionKey}`);
    return raceData;
  } catch (error) {
    console.error(`[Cache] Failed to load session ${sessionKey}:`, error);
    return null;
  }
}

/**
 * List all cached sessions
 */
export function listCachedSessions() {
  try {
    const index = loadIndex();

    return {
      sessions: Object.values(index.sessions).map(session => ({
        sessionKey: session.sessionKey,
        sessionName: session.sessionName,
        sessionType: session.sessionType,
        meetingName: session.meetingName,
        circuitName: session.circuitName,
        country: session.country,
        year: session.year,
        cached: session.cached,
        sizeMB: (session.sizeBytes / (1024 * 1024)).toFixed(2)
      })),
      totalSessions: Object.keys(index.sessions).length,
      totalSizeMB: (index.totalSizeBytes / (1024 * 1024)).toFixed(2),
      lastUpdated: index.lastUpdated
    };
  } catch (error) {
    console.error('[Cache] Failed to list sessions:', error);
    return {
      sessions: [],
      totalSessions: 0,
      totalSizeMB: 0,
      lastUpdated: null
    };
  }
}

/**
 * Check if session is cached
 */
export function isSessionCached(sessionKey) {
  try {
    const index = loadIndex();
    return !!index.sessions[sessionKey];
  } catch (error) {
    return false;
  }
}

/**
 * Delete cached session
 */
export function deleteCachedSession(sessionKey) {
  try {
    const index = loadIndex();

    if (!index.sessions[sessionKey]) {
      console.warn(`[Cache] Session ${sessionKey} not found`);
      return false;
    }

    const sessionDir = path.join(CACHE_DIR, `session_${sessionKey}`);

    // Delete session directory
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    // Update index
    const sizeBytes = index.sessions[sessionKey].sizeBytes || 0;
    delete index.sessions[sessionKey];
    index.totalSizeBytes -= sizeBytes;

    saveIndex(index);

    console.log(`[Cache] ✓ Deleted session ${sessionKey}`);
    return true;
  } catch (error) {
    console.error(`[Cache] Failed to delete session ${sessionKey}:`, error);
    return false;
  }
}

/**
 * Clear all cached sessions
 */
export function clearCache() {
  try {
    const index = loadIndex();

    // Delete all session directories
    Object.keys(index.sessions).forEach(sessionKey => {
      const sessionDir = path.join(CACHE_DIR, `session_${sessionKey}`);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    });

    // Reset index
    const newIndex = {
      version: '1.0',
      sessions: {},
      lastUpdated: new Date().toISOString(),
      totalSizeBytes: 0
    };

    saveIndex(newIndex);

    console.log('[Cache] ✓ Cleared all cached sessions');
    return true;
  } catch (error) {
    console.error('[Cache] Failed to clear cache:', error);
    return false;
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  try {
    const index = loadIndex();

    const sessionsByType = {};
    const sessionsByYear = {};

    Object.values(index.sessions).forEach(session => {
      // By type
      const type = session.sessionType || 'Unknown';
      sessionsByType[type] = (sessionsByType[type] || 0) + 1;

      // By year
      const year = session.year || 'Unknown';
      sessionsByYear[year] = (sessionsByYear[year] || 0) + 1;
    });

    return {
      totalSessions: Object.keys(index.sessions).length,
      totalSizeMB: (index.totalSizeBytes / (1024 * 1024)).toFixed(2),
      maxSizeMB: MAX_CACHE_SIZE_MB,
      utilizationPercent: ((index.totalSizeBytes / (MAX_CACHE_SIZE_MB * 1024 * 1024)) * 100).toFixed(2),
      lastUpdated: index.lastUpdated,
      sessionsByType,
      sessionsByYear,
      cacheDirectory: CACHE_DIR
    };
  } catch (error) {
    console.error('[Cache] Failed to get stats:', error);
    return null;
  }
}
