"""
Connect Real OpenF1 Data to ML Models
======================================
This module improves data authenticity by extracting ALL available
real data from OpenF1 cache instead of using approximations.

Run this to verify what real data is available:
python montecarlo/connect_real_data.py 9161
"""

import json
import sys
import os
import pandas as pd
from typing import Dict, List, Optional


def extract_full_driver_state(
    session_key: str,
    driver_number: int,
    at_lap: int = None
) -> Dict:
    """
    Extract complete driver state using REAL OpenF1 data
    
    Returns all available real data instead of approximations
    """
    cache_dir = os.path.join(os.getcwd(), '.openf1_cache')
    
    driver_state = {
        'driver_number': driver_number,
        'session_key': session_key,
        'data_sources': []  # Track what's real vs estimated
    }
    
    # 1. REAL LAP TIMES
    laps_file = os.path.join(cache_dir, f'session_{session_key}_laps.csv')
    if os.path.exists(laps_file):
        try:
            df = pd.read_csv(laps_file)
            driver_laps = df[df['driver_number'] == driver_number].copy()
            
            if at_lap:
                driver_laps = driver_laps[driver_laps['lap_number'] <= at_lap]
            
            driver_laps = driver_laps.sort_values('lap_number')
            
            # Recent lap times (REAL)
            recent = driver_laps.tail(5)
            driver_state['recent_lap_times'] = recent['lap_duration'].tolist()
            driver_state['current_lap'] = int(driver_laps['lap_number'].max())
            driver_state['data_sources'].append('lap_times: REAL from OpenF1')
            
            # Sector times (REAL)
            if 'duration_sector_1' in recent.columns:
                driver_state['sector_times'] = {
                    'sector_1': recent['duration_sector_1'].mean(),
                    'sector_2': recent['duration_sector_2'].mean(),
                    'sector_3': recent['duration_sector_3'].mean()
                }
                driver_state['data_sources'].append('sector_times: REAL from OpenF1')
            
        except Exception as e:
            print(f"Warning: Could not load lap data: {e}")
            driver_state['recent_lap_times'] = [90.0]
            driver_state['data_sources'].append('lap_times: FALLBACK')
    
    # 2. REAL POSITION DATA
    positions_file = os.path.join(cache_dir, f'session_{session_key}_positions.csv')
    if os.path.exists(positions_file):
        try:
            df = pd.read_csv(positions_file)
            driver_positions = df[df['driver_number'] == driver_number].copy()
            
            if len(driver_positions) > 0:
                # Get latest position (REAL)
                latest_position = int(driver_positions.iloc[-1]['position'])
                driver_state['position'] = latest_position
                driver_state['data_sources'].append('position: REAL from OpenF1')
            else:
                driver_state['position'] = 10  # Default
                driver_state['data_sources'].append('position: FALLBACK (no data)')
        except Exception as e:
            print(f"Warning: Could not load position data: {e}")
            driver_state['position'] = 10
            driver_state['data_sources'].append('position: FALLBACK')
    else:
        driver_state['position'] = 10
        driver_state['data_sources'].append('position: FALLBACK (file missing)')
    
    # 3. REAL PIT STOPS
    pit_file = os.path.join(cache_dir, f'session_{session_key}_pit.csv')
    if os.path.exists(pit_file):
        try:
            df = pd.read_csv(pit_file)
            driver_pits = df[df['driver_number'] == driver_number].copy()
            
            if at_lap:
                driver_pits = driver_pits[driver_pits['lap_number'] <= at_lap]
            
            driver_state['pit_stops_made'] = len(driver_pits)
            driver_state['pit_stop_laps'] = driver_pits['lap_number'].tolist()
            
            if len(driver_pits) > 0:
                last_pit_lap = int(driver_pits['lap_number'].max())
                current_lap = driver_state.get('current_lap', at_lap or 20)
                driver_state['tire_age'] = current_lap - last_pit_lap
                driver_state['data_sources'].append('tire_age: REAL (calculated from pit stops)')
            else:
                driver_state['tire_age'] = driver_state.get('current_lap', 10)
                driver_state['data_sources'].append('tire_age: REAL (no pit stops)')
            
            driver_state['data_sources'].append('pit_stops: REAL from OpenF1')
            
        except Exception as e:
            print(f"Warning: Could not load pit data: {e}")
            driver_state['pit_stops_made'] = 0
            driver_state['tire_age'] = 10
            driver_state['data_sources'].append('pit_stops: FALLBACK')
    else:
        driver_state['pit_stops_made'] = 0
        driver_state['tire_age'] = 10
        driver_state['data_sources'].append('pit_stops: FALLBACK (file missing)')
    
    # 4. REAL STINTS DATA (has tire compound!)
    stints_file = os.path.join(cache_dir, f'session_{session_key}_stints.csv')
    if os.path.exists(stints_file):
        try:
            df = pd.read_csv(stints_file)
            driver_stints = df[df['driver_number'] == driver_number].copy()
            
            if len(driver_stints) > 0:
                # Get current stint (REAL tire compound!)
                current_lap = driver_state.get('current_lap', 10)
                current_stint = driver_stints[
                    (driver_stints['lap_start'] <= current_lap) &
                    (driver_stints['lap_end'] >= current_lap)
                ]
                
                if len(current_stint) > 0:
                    driver_state['tire_compound'] = current_stint.iloc[0]['compound']
                    driver_state['data_sources'].append('tire_compound: REAL from stints')
                else:
                    driver_state['tire_compound'] = 'MEDIUM'
                    driver_state['data_sources'].append('tire_compound: FALLBACK')
            else:
                driver_state['tire_compound'] = 'MEDIUM'
                driver_state['data_sources'].append('tire_compound: FALLBACK')
                
        except Exception as e:
            print(f"Warning: Could not load stints data: {e}")
            driver_state['tire_compound'] = 'MEDIUM'
            driver_state['data_sources'].append('tire_compound: FALLBACK')
    else:
        driver_state['tire_compound'] = 'MEDIUM'
        driver_state['data_sources'].append('tire_compound: FALLBACK (file missing)')
    
    # 5. ESTIMATE FUEL LOAD (based on lap progression)
    # Note: OpenF1 doesn't provide fuel data, so this is always estimated
    total_laps = 60  # Typical race length
    current_lap = driver_state.get('current_lap', 10)
    fuel_consumed_pct = (current_lap / total_laps) * 100
    driver_state['fuel_load'] = max(0, 100 - fuel_consumed_pct)
    driver_state['data_sources'].append('fuel_load: ESTIMATED (not in OpenF1)')
    
    # 6. REAL CAR DATA (if available - speed, throttle, etc.)
    car_file = os.path.join(cache_dir, f'session_{session_key}_car_data.csv')
    if os.path.exists(car_file):
        try:
            df = pd.read_csv(car_file)
            driver_car = df[df['driver_number'] == driver_number].copy()
            
            if len(driver_car) > 0:
                recent_car = driver_car.tail(100)  # Last 100 samples
                driver_state['avg_speed'] = recent_car['speed'].mean()
                driver_state['avg_throttle'] = recent_car['throttle'].mean()
                driver_state['data_sources'].append('car_telemetry: REAL from OpenF1')
        except Exception as e:
            print(f"Warning: Could not load car data: {e}")
            driver_state['data_sources'].append('car_telemetry: FALLBACK')
    else:
        driver_state['data_sources'].append('car_telemetry: FALLBACK (file missing)')
    
    return driver_state


def verify_data_authenticity(session_key: str):
    """
    Verify what real data is available for a session
    """
    cache_dir = os.path.join(os.getcwd(), '.openf1_cache')
    
    print(f"\n{'='*60}")
    print(f"DATA AUTHENTICITY VERIFICATION")
    print(f"Session: {session_key}")
    print(f"{'='*60}\n")
    
    data_files = {
        'laps': f'session_{session_key}_laps.csv',
        'positions': f'session_{session_key}_positions.csv',
        'pit_stops': f'session_{session_key}_pit.csv',
        'stints': f'session_{session_key}_stints.csv',
        'car_data': f'session_{session_key}_car_data.csv',
        'weather': f'session_{session_key}_weather.csv',
        'race_control': f'session_{session_key}_race_control.csv'
    }
    
    availability = {}
    
    for name, filename in data_files.items():
        filepath = os.path.join(cache_dir, filename)
        if os.path.exists(filepath):
            try:
                df = pd.read_csv(filepath)
                availability[name] = {
                    'status': '✅ AVAILABLE',
                    'records': len(df),
                    'size_kb': os.path.getsize(filepath) / 1024
                }
            except:
                availability[name] = {'status': '❌ CORRUPTED', 'records': 0}
        else:
            availability[name] = {'status': '❌ MISSING', 'records': 0}
    
    # Print results
    for name, info in availability.items():
        status = info['status']
        if '✅' in status:
            print(f"{status} {name:20} ({info['records']:,} records, {info['size_kb']:.1f} KB)")
        else:
            print(f"{status} {name:20}")
    
    # Calculate authenticity score
    available_count = sum(1 for info in availability.values() if '✅' in info['status'])
    total_count = len(availability)
    authenticity_score = (available_count / total_count) * 100
    
    print(f"\n{'='*60}")
    print(f"AUTHENTICITY SCORE: {authenticity_score:.0f}%")
    print(f"({available_count}/{total_count} data sources available)")
    print(f"{'='*60}\n")
    
    return availability


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python connect_real_data.py <session_key> [driver_number]")
        sys.exit(1)
    
    session_key = sys.argv[1]
    
    # Verify data availability
    availability = verify_data_authenticity(session_key)
    
    # If driver number provided, show full driver state
    if len(sys.argv) > 2:
        driver_number = int(sys.argv[2])
        
        print(f"\n{'='*60}")
        print(f"DRIVER STATE EXTRACTION")
        print(f"Driver #{driver_number}")
        print(f"{'='*60}\n")
        
        driver_state = extract_full_driver_state(session_key, driver_number)
        
        # Print driver state
        print(json.dumps(driver_state, indent=2, default=str))
        
        # Print data sources
        print(f"\n{'='*60}")
        print("DATA SOURCES:")
        print(f"{'='*60}")
        for source in driver_state['data_sources']:
            if 'REAL' in source:
                print(f"✅ {source}")
            elif 'ESTIMATED' in source:
                print(f"⚠️  {source}")
            else:
                print(f"❌ {source}")
        print(f"{'='*60}\n")

