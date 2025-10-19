/**
 * OpenF1 File Cache
 * Saves OpenF1 API responses to CSV files to avoid refetching
 * Provides deduplication of location data
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(process.cwd(), '.openf1_cache');

/**
 * Ensure cache directory exists
 */
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log('[FileCache] Created cache directory:', CACHE_DIR);
  }
}

/**
 * Get cache file path for a session and data type
 */
function getCacheFilePath(sessionKey, dataType) {
  return path.join(CACHE_DIR, `session_${sessionKey}_${dataType}.csv`);
}

/**
 * Check if cache file exists
 */
function hasCachedData(sessionKey, dataType) {
  const filePath = getCacheFilePath(sessionKey, dataType);
  return fs.existsSync(filePath);
}

/**
 * Save data to CSV file
 */
function saveToCsv(sessionKey, dataType, data) {
  if (!data || data.length === 0) {
    console.log(`[FileCache] No data to save for ${dataType}`);
    return;
  }

  ensureCacheDir();
  const filePath = getCacheFilePath(sessionKey, dataType);

  // Get headers from first object
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(h => {
        const val = row[h];
        // Escape commas and quotes in values
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val ?? '';
      }).join(',')
    )
  ].join('\n');

  fs.writeFileSync(filePath, csv, 'utf8');
  const sizeMB = (Buffer.byteLength(csv, 'utf8') / (1024 * 1024)).toFixed(2);
  console.log(`[FileCache] Saved ${data.length} ${dataType} records to CSV (${sizeMB} MB)`);
}

/**
 * Load data from CSV file
 */
function loadFromCsv(sessionKey, dataType) {
  const filePath = getCacheFilePath(sessionKey, dataType);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const csv = fs.readFileSync(filePath, 'utf8');
    const lines = csv.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return [];
    }

    const headers = lines[0].split(',');
    const data = lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((header, index) => {
        let value = values[index];
        // Parse numbers
        if (value && !isNaN(value) && value !== '') {
          value = Number(value);
        }
        obj[header] = value;
      });
      return obj;
    });

    console.log(`[FileCache] Loaded ${data.length} ${dataType} records from CSV`);
    return data;
  } catch (error) {
    console.error(`[FileCache] Error loading ${dataType}:`, error.message);
    return null;
  }
}

/**
 * Deduplicate location data - only keep when X,Y,Z change
 * Groups by timestamp and driver, keeps only when coordinates change
 */
function deduplicateLocationData(locationData) {
  if (!locationData || locationData.length === 0) {
    return [];
  }

  console.log(`[FileCache] Deduplicating ${locationData.length} location points...`);
  
  // Sort by driver and date
  const sorted = [...locationData].sort((a, b) => {
    if (a.driver_number !== b.driver_number) {
      return a.driver_number - b.driver_number;
    }
    return new Date(a.date) - new Date(b.date);
  });

  const deduplicated = [];
  const lastPosition = {}; // Track last position per driver
  let duplicateCount = 0;
  let duplicateLog = [];

  sorted.forEach(point => {
    const driverKey = point.driver_number;
    const lastPos = lastPosition[driverKey];

    // Check if position changed
    const positionChanged = !lastPos || 
      lastPos.x !== point.x || 
      lastPos.y !== point.y || 
      lastPos.z !== point.z;

    if (positionChanged) {
      deduplicated.push(point);
      lastPosition[driverKey] = { x: point.x, y: point.y, z: point.z };
    } else {
      duplicateCount++;
      // Log first few duplicates
      if (duplicateLog.length < 5) {
        duplicateLog.push({
          driver: point.driver_number,
          date: point.date,
          coords: `(${point.x}, ${point.y}, ${point.z})`
        });
      }
    }
  });

  console.log(`[FileCache] Deduplication complete:`);
  console.log(`  - Original: ${locationData.length} points`);
  console.log(`  - Deduplicated: ${deduplicated.length} points`);
  console.log(`  - Removed: ${duplicateCount} duplicate positions`);
  console.log(`  - Reduction: ${((duplicateCount / locationData.length) * 100).toFixed(1)}%`);
  
  if (duplicateLog.length > 0) {
    console.log(`[FileCache] Sample duplicates (first 5):`);
    duplicateLog.forEach(dup => {
      console.log(`  - Driver ${dup.driver} at ${dup.date}: ${dup.coords}`);
    });
  }

  return deduplicated;
}

/**
 * Save complete session data to cache
 */
function saveSessionToCache(sessionKey, sessionData) {
  console.log(`[FileCache] Saving session ${sessionKey} to file cache...`);
  
  // Deduplicate location data before saving
  if (sessionData.locationData && sessionData.locationData.length > 0) {
    const deduplicated = deduplicateLocationData(sessionData.locationData);
    sessionData.locationData = deduplicated;
  }

  // Save each data type to separate CSV file
  saveToCsv(sessionKey, 'drivers', sessionData.drivers);
  saveToCsv(sessionKey, 'location', sessionData.locationData);
  saveToCsv(sessionKey, 'car_data', sessionData.carData); // Save car telemetry
  saveToCsv(sessionKey, 'laps', sessionData.laps);
  saveToCsv(sessionKey, 'positions', sessionData.positions);
  saveToCsv(sessionKey, 'pit', sessionData.pitStops); // Save pit stops
  saveToCsv(sessionKey, 'race_control', sessionData.raceControl);
  saveToCsv(sessionKey, 'weather', sessionData.weather);
  
  // Save metadata as JSON
  const metadata = {
    sessionInfo: sessionData.sessionInfo,
    meeting: sessionData.meeting,
  };
  const metadataPath = getCacheFilePath(sessionKey, 'metadata');
  fs.writeFileSync(
    metadataPath.replace('.csv', '.json'),
    JSON.stringify(metadata, null, 2),
    'utf8'
  );
  
  console.log(`[FileCache] Session ${sessionKey} cached successfully`);
}

/**
 * Load complete session data from cache
 */
function loadSessionFromCache(sessionKey) {
  console.log(`[FileCache] Loading session ${sessionKey} from file cache...`);
  
  // Check if metadata exists
  const metadataPath = getCacheFilePath(sessionKey, 'metadata').replace('.csv', '.json');
  if (!fs.existsSync(metadataPath)) {
    console.log(`[FileCache] No cache found for session ${sessionKey}`);
    return null;
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    
    // Load raw location data
    const rawLocationData = loadFromCsv(sessionKey, 'location') || [];
    
    // ALWAYS deduplicate location data when loading from cache
    // This reduces 95K+ points to ~14K for better performance
    const locationData = deduplicateLocationData(rawLocationData);
    
    const sessionData = {
      sessionInfo: metadata.sessionInfo,
      meeting: metadata.meeting,
      drivers: loadFromCsv(sessionKey, 'drivers') || [],
      locationData: locationData,
      laps: loadFromCsv(sessionKey, 'laps') || [],
      positions: loadFromCsv(sessionKey, 'positions') || [],
      pitStops: loadFromCsv(sessionKey, 'pit') || [], // Add pit stops
      raceControl: loadFromCsv(sessionKey, 'race_control') || [],
      weather: loadFromCsv(sessionKey, 'weather') || [],
      carData: loadFromCsv(sessionKey, 'car_data') || [], // Load car data from cache now
      intervals: [],
    };

    console.log(`[FileCache] Session ${sessionKey} loaded from cache`);
    console.log(`[FileCache] Location points: ${sessionData.locationData.length} (deduplicated)`);
    
    return sessionData;
  } catch (error) {
    console.error(`[FileCache] Error loading session from cache:`, error.message);
    return null;
  }
}

/**
 * Check if session is fully cached
 */
function isSessionCached(sessionKey) {
  const metadataPath = getCacheFilePath(sessionKey, 'metadata').replace('.csv', '.json');
  return fs.existsSync(metadataPath);
}

module.exports = {
  saveSessionToCache,
  loadSessionFromCache,
  isSessionCached,
  deduplicateLocationData,
  CACHE_DIR,
};

