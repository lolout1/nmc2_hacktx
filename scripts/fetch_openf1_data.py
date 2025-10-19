#!/usr/bin/env python3
"""
OpenF1 Data Scraper
Fetches F1 session data from api.openf1.org and saves to CSV files
Includes intelligent deduplication to remove duplicate X,Y,Z coordinates

Usage:
    python fetch_openf1_data.py --session-key 9161
    python fetch_openf1_data.py --session-key 9161 --output-dir ./data
"""

import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

# OpenF1 API base URL
API_BASE = "https://api.openf1.org/v1"

# Rate limiting
REQUEST_DELAY = 0.5  # 500ms between requests


def fetch_api(endpoint: str, params: Dict[str, Any] = None) -> List[Dict]:
    """
    Fetch data from OpenF1 API with error handling and retry logic
    """
    # Build URL with parameters
    url = f"{API_BASE}/{endpoint}"
    if params:
        query_parts = []
        for key, value in params.items():
            if value is not None:
                # Handle comparison operators in key (date>VALUE, date<VALUE)
                if '>' in key or '<' in key:
                    query_parts.append(key)
                else:
                    query_parts.append(f"{key}={value}")
        if query_parts:
            url += "?" + "&".join(query_parts)
    
    print(f"  Fetching: {url}")
    
    # Retry logic
    for attempt in range(3):
        try:
            req = Request(url)
            req.add_header('Accept', 'application/json')
            with urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode('utf-8'))
                print(f"  ✓ Received {len(data)} items")
                return data
        except HTTPError as e:
            if e.code == 429:  # Rate limited
                wait_time = (2 ** attempt) * 1000  # Exponential backoff
                print(f"  Rate limited, waiting {wait_time}ms...")
                time.sleep(wait_time / 1000)
                continue
            elif e.code == 422:
                print(f"  ⚠ API returned 422 (data not available)")
                return []
            else:
                print(f"  ✗ HTTP Error {e.code}: {e.reason}")
                if attempt < 2:
                    time.sleep(1)
                    continue
                return []
        except (URLError, Exception) as e:
            print(f"  ✗ Error: {e}")
            if attempt < 2:
                time.sleep(1)
                continue
            return []
    
    return []


def deduplicate_location_data(location_data: List[Dict]) -> List[Dict]:
    """
    Deduplicate location data - only keep points where X, Y, or Z changed
    """
    if not location_data:
        return []
    
    print(f"\n[Deduplication] Processing {len(location_data)} location points...")
    
    # Sort by driver and date
    sorted_data = sorted(location_data, key=lambda p: (p['driver_number'], p['date']))
    
    deduplicated = []
    last_position = {}  # Track last position per driver
    duplicate_count = 0
    duplicate_samples = []
    
    for point in sorted_data:
        driver = point['driver_number']
        last_pos = last_position.get(driver)
        
        # Check if position changed
        position_changed = (
            not last_pos or
            last_pos['x'] != point['x'] or
            last_pos['y'] != point['y'] or
            last_pos['z'] != point['z']
        )
        
        if position_changed:
            deduplicated.append(point)
            last_position[driver] = {
                'x': point['x'],
                'y': point['y'],
                'z': point['z']
            }
        else:
            duplicate_count += 1
            # Log first 5 duplicates
            if len(duplicate_samples) < 5:
                duplicate_samples.append({
                    'driver': driver,
                    'date': point['date'],
                    'coords': f"({point['x']}, {point['y']}, {point['z']})"
                })
    
    reduction_pct = (duplicate_count / len(location_data)) * 100 if location_data else 0
    
    print(f"[Deduplication] Complete:")
    print(f"  - Original: {len(location_data)} points")
    print(f"  - Deduplicated: {len(deduplicated)} points")
    print(f"  - Removed: {duplicate_count} duplicates")
    print(f"  - Reduction: {reduction_pct:.1f}%")
    
    if duplicate_samples:
        print(f"[Deduplication] Sample duplicates:")
        for dup in duplicate_samples:
            print(f"  - Driver {dup['driver']} at {dup['date']}: {dup['coords']}")
    
    return deduplicated


def save_to_csv(data: List[Dict], filename: str, output_dir: str):
    """
    Save data to CSV file
    """
    if not data:
        print(f"  No data to save for {filename}")
        return
    
    filepath = os.path.join(output_dir, filename)
    
    # Get all unique keys from all records
    keys = set()
    for row in data:
        keys.update(row.keys())
    keys = sorted(keys)
    
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(data)
    
    file_size = os.path.getsize(filepath)
    size_mb = file_size / (1024 * 1024)
    print(f"  ✓ Saved {len(data)} records to {filename} ({size_mb:.2f} MB)")


def fetch_session_data(session_key: int, output_dir: str):
    """
    Fetch all data for a session and save to CSV files
    """
    print(f"\n{'='*60}")
    print(f"Fetching OpenF1 data for session_key={session_key}")
    print(f"Output directory: {output_dir}")
    print(f"{'='*60}\n")
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Fetch session info
    print("[1/9] Fetching session info...")
    sessions = fetch_api('sessions', {'session_key': session_key})
    if not sessions:
        print("✗ Session not found!")
        return
    
    session_info = sessions[0]
    print(f"  Session: {session_info['session_name']}")
    print(f"  Date: {session_info['date_start']} to {session_info['date_end']}")
    time.sleep(REQUEST_DELAY)
    
    # 2. Fetch meeting info
    print("\n[2/9] Fetching meeting info...")
    meeting_key = session_info['meeting_key']
    meetings = fetch_api('meetings', {'meeting_key': meeting_key})
    meeting = meetings[0] if meetings else {}
    time.sleep(REQUEST_DELAY)
    
    # 3. Fetch drivers
    print("\n[3/9] Fetching drivers...")
    drivers = fetch_api('drivers', {'session_key': session_key})
    save_to_csv(drivers, f'session_{session_key}_drivers.csv', output_dir)
    time.sleep(REQUEST_DELAY)
    
    # 4. Fetch laps
    print("\n[4/9] Fetching laps...")
    laps = fetch_api('laps', {'session_key': session_key})
    save_to_csv(laps, f'session_{session_key}_laps.csv', output_dir)
    time.sleep(REQUEST_DELAY)
    
    # 5. Fetch positions
    print("\n[5/9] Fetching positions...")
    positions = fetch_api('position', {'session_key': session_key})
    save_to_csv(positions, f'session_{session_key}_positions.csv', output_dir)
    time.sleep(REQUEST_DELAY)
    
    # 6. Fetch location data in chunks (requires date filters)
    print("\n[6/9] Fetching location data (chunked)...")
    location_data = []
    
    session_start = datetime.fromisoformat(session_info['date_start'].replace('Z', '+00:00'))
    session_end = datetime.fromisoformat(session_info['date_end'].replace('Z', '+00:00'))
    
    # Fetch in 5-minute chunks
    chunk_size = timedelta(minutes=5)
    current_start = session_start
    chunk_num = 1
    
    while current_start < session_end:
        current_end = min(current_start + chunk_size, session_end)
        
        print(f"  Chunk {chunk_num}: {current_start.strftime('%H:%M')} - {current_end.strftime('%H:%M')}")
        
        params = {
            'session_key': session_key,
            f'date>{current_start.isoformat()}': None,
            f'date<{current_end.isoformat()}': None,
        }
        
        chunk_data = fetch_api('location', params)
        location_data.extend(chunk_data)
        
        current_start = current_end
        chunk_num += 1
        time.sleep(REQUEST_DELAY)
    
    # Deduplicate location data
    if location_data:
        location_data = deduplicate_location_data(location_data)
    
    save_to_csv(location_data, f'session_{session_key}_location.csv', output_dir)
    
    # 7. Fetch race control
    print("\n[7/9] Fetching race control...")
    race_control = fetch_api('race_control', {'session_key': session_key})
    save_to_csv(race_control, f'session_{session_key}_race_control.csv', output_dir)
    time.sleep(REQUEST_DELAY)
    
    # 8. Fetch weather
    print("\n[8/9] Fetching weather...")
    weather = fetch_api('weather', {'session_key': session_key})
    save_to_csv(weather, f'session_{session_key}_weather.csv', output_dir)
    time.sleep(REQUEST_DELAY)
    
    # 9. Fetch intervals (may not be available for all sessions)
    print("\n[9/9] Fetching intervals...")
    intervals = fetch_api('intervals', {'session_key': session_key})
    if intervals:
        save_to_csv(intervals, f'session_{session_key}_intervals.csv', output_dir)
    time.sleep(REQUEST_DELAY)
    
    # Save metadata as JSON
    print("\n[Metadata] Saving session metadata...")
    metadata = {
        'session': session_info,
        'meeting': meeting,
        'fetched_at': datetime.utcnow().isoformat(),
        'stats': {
            'drivers': len(drivers),
            'location': len(location_data),
            'laps': len(laps),
            'positions': len(positions),
            'race_control': len(race_control),
            'weather': len(weather),
            'intervals': len(intervals),
        }
    }
    
    metadata_file = os.path.join(output_dir, f'session_{session_key}_metadata.json')
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"  ✓ Saved metadata to session_{session_key}_metadata.json")
    
    # Summary
    print(f"\n{'='*60}")
    print("✓ Data fetch complete!")
    print(f"{'='*60}")
    print(f"\nSummary:")
    print(f"  Drivers: {len(drivers)}")
    print(f"  Location points: {len(location_data)} (deduplicated)")
    print(f"  Laps: {len(laps)}")
    print(f"  Positions: {len(positions)}")
    print(f"  Race control: {len(race_control)}")
    print(f"  Weather: {len(weather)}")
    print(f"  Intervals: {len(intervals)}")
    print(f"\nFiles saved to: {output_dir}")


def main():
    parser = argparse.ArgumentParser(
        description='Fetch OpenF1 session data and save to CSV files'
    )
    parser.add_argument(
        '--session-key',
        type=int,
        required=True,
        help='Session key to fetch (e.g., 9161 for 2023 Singapore GP Practice 1)'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='./.openf1_cache',
        help='Output directory for CSV files (default: ./.openf1_cache)'
    )
    
    args = parser.parse_args()
    
    try:
        fetch_session_data(args.session_key, args.output_dir)
    except KeyboardInterrupt:
        print("\n\n✗ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()

