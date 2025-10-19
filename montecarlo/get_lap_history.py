"""
Get Lap History from OpenF1 Cache
==================================
Helper script to extract lap time history for Bayesian updates
"""

import json
import sys
import os
import pandas as pd


def get_lap_history(session_key: str, driver_number: int, up_to_lap: int = None):
    """
    Extract lap time history from OpenF1 cache
    
    Args:
        session_key: Session key
        driver_number: Driver number
        up_to_lap: Only include laps up to this number (for replay mode)
        
    Returns:
        List of (lap_number, lap_time) tuples
    """
    cache_dir = os.path.join(os.getcwd(), '.openf1_cache')
    laps_file = os.path.join(cache_dir, f'session_{session_key}_laps.csv')
    
    if not os.path.exists(laps_file):
        print(f"Warning: No lap data found for session {session_key}", file=sys.stderr)
        return []
    
    try:
        # Load lap data
        df = pd.read_csv(laps_file)
        
        # Filter for this driver
        driver_laps = df[df['driver_number'] == driver_number].copy()
        
        if len(driver_laps) == 0:
            print(f"Warning: No laps found for driver {driver_number}", file=sys.stderr)
            return []
        
        # Filter by lap number if specified
        if up_to_lap:
            driver_laps = driver_laps[driver_laps['lap_number'] <= up_to_lap]
        
        # Sort by lap number
        driver_laps = driver_laps.sort_values('lap_number')
        
        # Extract lap times (filter out invalid times)
        lap_times = []
        for _, row in driver_laps.iterrows():
            lap_num = int(row['lap_number'])
            lap_duration = row.get('lap_duration')
            
            # Skip invalid lap times
            if pd.isna(lap_duration) or lap_duration <= 0 or lap_duration > 200:
                continue
            
            lap_times.append((lap_num, float(lap_duration)))
        
        return lap_times
        
    except Exception as e:
        print(f"Error loading lap history: {e}", file=sys.stderr)
        return []


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({
            'error': 'Usage: python get_lap_history.py <session_key> <driver_number> [up_to_lap]'
        }))
        sys.exit(1)
    
    session_key = sys.argv[1]
    driver_number = int(sys.argv[2])
    up_to_lap = int(sys.argv[3]) if len(sys.argv) > 3 else None
    
    lap_times = get_lap_history(session_key, driver_number, up_to_lap)
    
    output = {
        'session_key': session_key,
        'driver_number': driver_number,
        'lap_times': lap_times,
        'count': len(lap_times)
    }
    
    print(json.dumps(output, indent=2))

