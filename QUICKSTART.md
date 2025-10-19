# OpenF1 Monaco - Quick Start Guide

This project now uses the OpenF1 API to replay historical F1 sessions with real-time car positioning data!

## 🚀 Quick Start

### Option 1: Use Pre-fetched Data (Recommended - Instant)

If data is already cached in `.openf1_cache/`, just run:

```bash
npm run dev
```

Then visit http://localhost:3000 and click on "2023 Singapore Grand Prix - Practice 1"

### Option 2: Fetch Fresh Data with Python Script

If you need to fetch fresh data:

```bash
# Fetch 2023 Singapore GP Practice 1
python scripts/fetch_openf1_data.py --session-key 9161

# Then start the app
npm run dev
```

The Python script will:
- ✅ Fetch all data from OpenF1 API (~60 seconds)
- ✅ Deduplicate location data (saves 95% space!)
- ✅ Save to CSV files in `.openf1_cache/`
- ✅ Cache for instant future loads

## 📊 What You'll See

- **Live Map**: Real-time car positions moving on the Singapore track
- **Timing Table**: Driver positions, lap times, and sector times
- **Speed Trap**: Best speeds at intermediate points
- **Race Control**: Track status messages and flags
- **Weather**: Temperature, humidity, wind data
- **Playback Controls**: Play/pause, speed adjustment (0.5x to 5x), scrub timeline

## 🎮 Controls

- **Play/Pause**: Start/stop the replay
- **Speed**: Adjust playback speed (0.5x, 1x, 2x, 5x)
- **Seek**: Click on the timeline to jump to any point
- **Live Mode**: Switch back to live F1 timing (when a session is active)

## 🗺️ Track Map

The Singapore track will display all 20 cars as colored dots moving in real-time based on historical telemetry data (X, Y, Z coordinates from OpenF1).

## 📈 Data Source

- **API**: https://api.openf1.org
- **Session**: 2023 Singapore Grand Prix - Practice 1
- **Session Key**: 9161
- **Data Points**: ~273K location points (14K after deduplication)
- **Duration**: ~60 minutes of practice session

## 🔧 Troubleshooting

### Error: "Cannot read properties of undefined"

**Solution**: Clear cache and restart:
```bash
# Remove cached data
rm -rf .openf1_cache
# Or on Windows:
# rmdir /s .openf1_cache

# Re-fetch with Python script
python scripts/fetch_openf1_data.py --session-key 9161

# Restart app
npm run dev
```

### No cars on map / Empty session

**Solution**: The cache might have incomplete data. Delete the cache directory and re-run the Python fetcher.

### Rate limited by OpenF1 API

**Solution**: The Python script already handles this with:
- 500ms delays between requests
- Exponential backoff for 429 errors
- Chunked fetching for large datasets

If you still hit limits, just wait a minute and try again.

## 🆘 Support

- **OpenF1 Docs**: https://openf1.org
- **GitHub Issues**: Report bugs in this repository
- **F1 API**: This is historical data only (no live streaming without paid account)

## 🎯 Available Sessions

Currently curated session:
- **2023 Singapore Grand Prix - Practice 1** (session_key: 9161)
  - Complete telemetry
  - Full location data
  - All 20 drivers
  - Perfect for testing and development

To add more sessions:
1. Find session keys: `curl "https://api.openf1.org/v1/sessions?year=2023"`
2. Fetch with Python: `python scripts/fetch_openf1_data.py --session-key XXXX`
3. Update `pages/api/openf1/sessions.js` to include the new session

## 📝 Notes

- Historical data is free (no API key required)
- Data is cached locally in CSV format
- First load takes ~60 seconds, subsequent loads are instant
- Deduplication removes 95% of redundant location points
- The app respects OpenF1 rate limits automatically

Enjoy the replay! 🏎️💨

