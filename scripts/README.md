# OpenF1 Data Scraper

Python script to fetch and cache F1 session data from api.openf1.org

## Features

- ✅ Fetches all endpoints (drivers, car_data, location, laps, positions, race control, weather)
- ✅ **Car telemetry**: Gear, RPM, speed, throttle, brake, DRS (~3.7Hz sample rate)
- ✅ Intelligent deduplication (removes duplicate X,Y,Z coordinates)
- ✅ Rate limiting protection (500ms delays, exponential backoff)
- ✅ Saves to CSV files for easy processing
- ✅ Includes metadata JSON with session info
- ✅ Chunked fetching (5-minute intervals) for location and car_data

## Requirements

- Python 3.6+ (uses only standard library - no pip install needed!)

## Usage

### Basic Usage

```bash
# Fetch 2023 Singapore GP Practice 1 (session_key=9161)
python fetch_openf1_data.py --session-key 9161
```

### Custom Output Directory

```bash
# Save to custom directory
python fetch_openf1_data.py --session-key 9161 --output-dir ./my_data
```

### Other Session Keys

```bash
# 2023 Singapore GP Practice 2
python fetch_openf1_data.py --session-key 9162

# 2023 Singapore GP Qualifying
python fetch_openf1_data.py --session-key 9164

# 2023 Singapore GP Race
python fetch_openf1_data.py --session-key 9165
```

## Output Files

The script creates these files in the output directory (default: `.openf1_cache/`):

```
.openf1_cache/
├── session_9161_drivers.csv          # Driver information
├── session_9161_car_data.csv         # 🆕 Telemetry: gear, RPM, speed, throttle, brake, DRS
├── session_9161_location.csv         # X,Y,Z coordinates (deduplicated!)
├── session_9161_laps.csv             # Lap times and sectors
├── session_9161_positions.csv        # Race positions over time
├── session_9161_race_control.csv     # Track status, flags, messages
├── session_9161_weather.csv          # Weather conditions
├── session_9161_intervals.csv        # Gaps between drivers (if available)
└── session_9161_metadata.json        # Session info and stats
```

## Example Output

```
============================================================
Fetching OpenF1 data for session_key=9161
Output directory: ./.openf1_cache
============================================================

[1/9] Fetching session info...
  Fetching: https://api.openf1.org/v1/sessions?session_key=9161
  ✓ Received 1 items
  Session: Practice 1
  Date: 2023-09-16T13:00:00.000Z to 2023-09-16T14:00:00.000Z

[2/9] Fetching meeting info...
  ...

[6/10] Fetching car_data (telemetry - chunked)...
  Chunk 1: 13:00 - 13:05
  ✓ Received 23000 items
  Chunk 2: 13:05 - 13:10
  ✓ Received 22800 items
  ...

[7/10] Fetching location data (chunked)...
  Chunk 1: 13:00 - 13:05
  Fetching: https://api.openf1.org/v1/location?session_key=9161&date>...
  ✓ Received 23100 items
  Chunk 2: 13:05 - 13:10
  ...

[Deduplication] Processing 273420 location points...
[Deduplication] Complete:
  - Original: 273420 points
  - Deduplicated: 13671 points
  - Removed: 259749 duplicates
  - Reduction: 95.0%
[Deduplication] Sample duplicates:
  - Driver 1 at 2023-09-16T13:05:23.456Z: (567, 3195, 187)
  ...

============================================================
✓ Data fetch complete!
============================================================

Summary:
  Drivers: 20
  Car data (telemetry): 270000
  Location points: 13671 (deduplicated)
  Laps: 297
  Positions: 1145
  Race control: 42
  Weather: 110
  Intervals: 0

Files saved to: ./.openf1_cache
```

## Deduplication Logic

The script removes location points where X, Y, and Z coordinates are identical to the previous point for that driver:

```python
# Keep only if position changed
if (point.x != last_point.x or 
    point.y != last_point.y or 
    point.z != last_point.z):
    keep(point)  # Position changed
else:
    skip(point)  # Duplicate coordinates
    log(f"Duplicate at {point.date}: Driver {point.driver_number}")
```

This typically reduces data size by **95%** (273K → 14K points)!

## Rate Limiting

The script includes protection against OpenF1 API rate limits:

1. **500ms delay** between all requests
2. **Exponential backoff** for 429 errors (1s → 2s → 4s)
3. **3 retry attempts** per request
4. **Chunked fetching** for location data (5-minute intervals)

## Finding Session Keys

Use the OpenF1 API to find session keys:

```bash
# Get all sessions for 2023 Singapore GP
curl "https://api.openf1.org/v1/sessions?year=2023&country_name=Singapore"
```

Or visit: https://openf1.org

## Error Handling

The script handles common errors gracefully:

- **422 errors**: Data not available (returns empty array)
- **429 errors**: Rate limited (waits and retries)
- **Network errors**: Retries up to 3 times
- **Keyboard interrupt**: Clean exit with Ctrl+C

## Integration with Node.js App

After running the Python script, the Node.js app will automatically detect and use the cached CSV files:

```bash
# 1. Fetch data with Python
python scripts/fetch_openf1_data.py --session-key 9161

# 2. Start Node.js app
npm run dev

# 3. Session loads instantly from cache!
```

## Tips

- **First time**: Takes 30-60 seconds to fetch all data
- **Subsequent loads**: Instant (< 1 second from CSV files)
- **Disk usage**: ~2-3 MB per session
- **Best practice**: Fetch once, use forever!

## License

Same as Monaco project

