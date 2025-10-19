# OpenF1 API Integration

## Overview

Monaco now uses the **OpenF1 API** (https://api.openf1.org) for historical F1 session replay functionality. This integration provides real-time telemetry data including car positions, speed, throttle, brake, RPM, and more.

## Key Features

### 🎯 Core Functionality
- **Historical Session Replay**: Full replay of F1 practice, qualifying, and race sessions
- **Real-Time Position Tracking**: X,Y,Z coordinates for accurate map visualization
- **Complete Telemetry**: Speed, RPM, throttle, brake, gear, DRS status
- **Race Control Messages**: Track status, flags, safety car notifications
- **Weather Data**: Temperature, humidity, wind, rainfall

### 🚀 Performance Optimizations

#### 1. File-Based Caching (CSV)
- **Automatic caching** of OpenF1 API responses to local CSV files
- **Cache directory**: `.openf1_cache/` (auto-created on first use)
- **Persistent storage** - data survives server restarts
- **Immediate loading** on subsequent requests (no API calls needed)

#### 2. Intelligent Deduplication
- **Filters duplicate coordinates**: Only stores location data when X,Y,Z positions actually change
- **Massive data reduction**: Typically reduces 273,000+ location points to ~14,000 unique positions
- **Logs duplicates**: First 5 duplicate positions logged with timestamps for debugging
- **Performance impact**: ~95% reduction in data size

#### 3. Rate Limiting Protection
- **Sequential API fetching** with 500ms delays between requests
- **Exponential backoff** for 429 (Too Many Requests) errors
- **Chunked location data fetching** in 5-minute intervals
- **Automatic retry logic** with up to 4 attempts per request

## Architecture

### Data Flow

```
User selects session
       ↓
Check file cache (.openf1_cache/)
       ↓
   Cache hit? ──→ Yes ──→ Load from CSV (instant)
       ↓
      No
       ↓
Fetch from OpenF1 API
       ↓
Deduplicate location data
       ↓
Save to CSV cache
       ↓
Transform to Monaco format
       ↓
Build replay timeline
       ↓
Start playback
```

### File Structure

```
.openf1_cache/
├── session_9161_drivers.csv
├── session_9161_location.csv        ← Deduplicated!
├── session_9161_laps.csv
├── session_9161_positions.csv
├── session_9161_race_control.csv
├── session_9161_weather.csv
└── session_9161_metadata.json
```

### Key Components

#### 1. **openf1FileCache.js** (`utils/`)
- **Purpose**: Manages CSV file caching and deduplication
- **Functions**:
  - `isSessionCached(sessionKey)` - Check if session exists in cache
  - `loadSessionFromCache(sessionKey)` - Load session from CSV files
  - `saveSessionToCache(sessionKey, data)` - Save and deduplicate session data
  - `deduplicateLocationData(locationData)` - Remove duplicate coordinates

#### 2. **openf1Transformer.js** (`utils/`)
- **Purpose**: Transforms OpenF1 data format to Monaco format
- **Functions**:
  - `transformLocation(locationData)` - Convert to Position snapshots
  - `transformCarData(carData)` - Convert to CarData entries
  - `transformDrivers(drivers)` - Convert to DriverList
  - `transformCompleteSession(data)` - Main transformation pipeline

#### 3. **session-data.js** (`pages/api/openf1/`)
- **Purpose**: API endpoint for fetching session data
- **Flow**:
  1. Check file cache
  2. If cache exists → return immediately
  3. If no cache → fetch from OpenF1 API
  4. Deduplicate and cache
  5. Return data

## Available Session

### 2023 Singapore Grand Prix - Practice 1
- **Session Key**: `9161`
- **Date**: September 16, 2023
- **Duration**: 1 hour (09:00 - 10:00 UTC)
- **Location Data**: ~273,000 raw points → ~14,000 unique positions after deduplication
- **Drivers**: 20
- **Laps**: 297

**Why Practice 1?**
- Practice sessions have the **most complete telemetry data**
- Race sessions often have **limited location data** availability in OpenF1
- Full X,Y,Z coordinates available for accurate map tracking

## Deduplication Example

**Before Deduplication:**
```
273,420 location points
4.2 MB API response
⚠️  Exceeds Next.js 4MB limit
```

**After Deduplication:**
```
~14,000 unique positions (95% reduction!)
~600 KB response size
✅ Well under 4MB limit
```

**Duplicate Detection Logic:**
```javascript
// Only keep location point if X, Y, or Z changed
if (point.x !== lastPoint.x || 
    point.y !== lastPoint.y || 
    point.z !== lastPoint.z) {
  keep(point);  // Position changed - keep it
} else {
  skip(point);  // Same position - duplicate
  log(`Duplicate at ${point.date}: Driver ${point.driver_number}`);
}
```

## Rate Limiting Strategy

### 1. Sequential Fetching
```javascript
// Fetch data one at a time with delays
await fetchDrivers();
await delay(500ms);
await fetchMeeting();
await delay(500ms);
// ... etc
```

### 2. Chunked Location Data
```javascript
// Split session into 5-minute chunks
while (currentTime < sessionEnd) {
  fetch location data for 5-minute window
  await delay(500ms)
  currentTime += 5 minutes
}
```

### 3. Exponential Backoff
```javascript
if (response.status === 429) {
  waitTime = min(1000 * 2^attempt, 10000)  // Max 10 seconds
  wait(waitTime)
  retry()
}
```

## Usage

### Accessing Historical Replay

1. **Start the server**: `npm run dev`
2. **Open browser**: http://localhost:3000
3. **Click**: "📚 BROWSE HISTORY" button
4. **Select**: "2023 Singapore Grand Prix - Practice 1"
5. **Wait**: First load fetches and caches data (~30-60 seconds)
6. **Subsequent loads**: Instant (loads from cache)

### Playback Controls

- **▶ Play / ⏸ Pause**: Control playback
- **Progress Bar**: Click or drag to seek
- **Speed**: 0.5x, 1x, 2x, 5x, 10x
- **Reset**: Jump to start
- **Quality**: LOW (5x), MEDIUM (10x), HIGH (20x), ULTRA (30x) interpolation

### Cache Management

**View cache location:**
```bash
ls -lh .openf1_cache/
```

**Clear cache:**
```bash
rm -rf .openf1_cache/
```

**Cache will automatically rebuild on next session load**

## Data Sources

### OpenF1 API Endpoints Used

| Endpoint | Purpose | Sample Rate |
|----------|---------|-------------|
| `/sessions` | Session metadata | Static |
| `/meetings` | Grand Prix info | Static |
| `/drivers` | Driver details | Static |
| `/location` | X,Y,Z coordinates | ~3.7 Hz |
| `/car_data` | Telemetry (speed, RPM, etc) | ~3.7 Hz |
| `/laps` | Lap times, sectors | Per lap |
| `/position` | Race positions | ~4 seconds |
| `/race_control` | Track status, flags | Event-based |
| `/weather` | Weather conditions | ~1 minute |

### Data Availability Notes

- **Location data**: Requires date range filters (`date>VALUE` and `date<VALUE`)
- **Car data**: May return 422 error for some sessions (not always available)
- **Practice sessions**: Most complete data
- **Race sessions**: Limited location data (often incomplete)

## Performance Metrics

### First Load (No Cache)
- **API Requests**: ~30-40 requests
- **Time**: 30-60 seconds
- **Data Fetched**: ~275,000 location points
- **Data Cached**: ~14,000 unique positions
- **Disk Usage**: ~2-3 MB (all CSV files combined)

### Subsequent Loads (With Cache)
- **API Requests**: 0 (pure cache)
- **Time**: < 1 second
- **Data Source**: Local CSV files
- **Response Size**: ~600 KB

### Memory Usage
- **Server**: ~50-100 MB during fetch, ~20 MB steady state
- **Client**: ~30-50 MB for replay engine + timeline
- **Cache**: ~2-3 MB on disk per session

## Troubleshooting

### "SESSION DATA INCOMPLETE" Error

**Cause**: No location data or all positions identical

**Solutions**:
1. Clear cache: `rm -rf .openf1_cache/`
2. Try a different session (Practice sessions work best)
3. Check console for deduplication logs

### "API response exceeds 4MB" Warning

**Cause**: Location data not deduplicated

**Solution**: This is now automatically handled by deduplication. If you see this, the cache system isn't working properly. Check that `openf1FileCache.js` is being imported correctly.

### Rate Limiting (429 Errors)

**Cause**: Too many requests to OpenF1 API

**Solution**: The system now:
- Fetches sequentially with delays
- Uses exponential backoff
- Caches everything to avoid repeat requests

### Slow Initial Load

**Expected**: First load takes 30-60 seconds (fetching 273K+ location points)

**Subsequent loads**: < 1 second (from cache)

**Tip**: Be patient on first load - the data is being cached for instant future access!

## Future Enhancements

- [ ] Support multiple sessions (2024 races)
- [ ] Pre-cache popular sessions
- [ ] Compression of CSV cache files (gzip)
- [ ] Background cache updates
- [ ] IndexedDB fallback for browser-side caching
- [ ] Session comparison mode
- [ ] Export replay data

## API Reference

### OpenF1 File Cache

```javascript
import {
  isSessionCached,
  loadSessionFromCache,
  saveSessionToCache,
  deduplicateLocationData
} from '@monaco/utils/openf1FileCache';

// Check cache
if (isSessionCached('9161')) {
  const data = loadSessionFromCache('9161');
}

// Save to cache (auto-deduplicates)
saveSessionToCache('9161', sessionData);

// Manual deduplication
const deduplicated = deduplicateLocationData(locationData);
```

### OpenF1 Transformer

```javascript
import { transformCompleteSession } from '@monaco/utils/openf1Transformer';

// Transform OpenF1 data to Monaco format
const monacoData = transformCompleteSession(openf1Data);
```

## Credits

- **OpenF1 API**: https://openf1.org
- **Monaco Project**: F1 Live Timing Dashboard
- **FastF1**: Original inspiration for OpenF1

## License

Same as Monaco project

