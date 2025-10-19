"""
Monte Carlo F1 Race Predictions
Uses Monte Carlo simulation to predict lap times, positions, and pit stop windows
"""

import json
import sys
import numpy as np
from typing import Dict, List
import random

# Configuration
SIMULATIONS = 10000
CONFIDENCE_THRESHOLD = 0.75


def load_session_data(session_key: str) -> Dict:
    """Load session data from OpenF1 cache"""
    # In production, this would load from the cache or API
    # For now, we'll simulate with mock data
    return {
        'session_key': session_key,
        'drivers': [],
        'laps': [],
        'positions': []
    }


def simulate_lap_time(driver_num: int, base_time: float, variance: float) -> float:
    """Simulate a single lap time using normal distribution"""
    # Add random variation based on track conditions, tire degradation, etc.
    return np.random.normal(base_time, variance)


def monte_carlo_lap_times(drivers_data: List[Dict], num_simulations: int = SIMULATIONS) -> List[Dict]:
    """
    Monte Carlo simulation for lap time predictions
    
    Args:
        drivers_data: List of driver data with historical lap times
        num_simulations: Number of Monte Carlo iterations
    
    Returns:
        List of predicted lap times with confidence intervals
    """
    predictions = []
    
    for driver in drivers_data:
        driver_num = driver.get('driver_number', 0)
        laps = driver.get('laps', [])
        
        if not laps:
            continue
        
        # Calculate base lap time (average of last 5 laps)
        recent_laps = laps[-5:] if len(laps) >= 5 else laps
        lap_times = [lap.get('lap_duration', 90.0) for lap in recent_laps if lap.get('lap_duration')]
        
        if not lap_times:
            continue
        
        base_time = np.mean(lap_times)
        variance = np.std(lap_times) if len(lap_times) > 1 else 0.5
        
        # Run Monte Carlo simulation
        simulated_times = []
        for _ in range(num_simulations):
            sim_time = simulate_lap_time(driver_num, base_time, variance)
            simulated_times.append(sim_time)
        
        # Calculate statistics
        predicted_time = np.mean(simulated_times)
        confidence_lower = np.percentile(simulated_times, 5)
        confidence_upper = np.percentile(simulated_times, 95)
        confidence = 1.0 - (confidence_upper - confidence_lower) / base_time
        
        predictions.append({
            'driver': driver_num,
            'predicted_time': f"{predicted_time:.3f}s",
            'confidence': f"{confidence * 100:.1f}",
            'range': f"{confidence_lower:.3f}s - {confidence_upper:.3f}s"
        })
    
    # Sort by predicted time
    predictions.sort(key=lambda x: float(x['predicted_time'].replace('s', '')))
    
    return predictions


def monte_carlo_positions(drivers_data: List[Dict], num_simulations: int = SIMULATIONS) -> List[Dict]:
    """
    Monte Carlo simulation for final position predictions
    
    Args:
        drivers_data: List of driver data with current positions
        num_simulations: Number of Monte Carlo iterations
    
    Returns:
        List of predicted final positions with probabilities
    """
    predictions = []
    
    # Get current positions
    current_positions = {}
    for driver in drivers_data:
        driver_num = driver.get('driver_number', 0)
        position = driver.get('position', 20)
        current_positions[driver_num] = position
    
    # Simulate race outcomes
    position_counts = {driver: {} for driver in current_positions}
    
    for _ in range(num_simulations):
        # Simulate final positions with some randomness
        simulated_positions = {}
        
        for driver_num, current_pos in current_positions.items():
            # Position can vary ±3 positions with some probability
            variation = int(np.random.triangular(-3, 0, 3))
            final_pos = max(1, min(20, current_pos + variation))
            simulated_positions[driver_num] = final_pos
        
        # Record the simulated position for each driver
        for driver_num, pos in simulated_positions.items():
            position_counts[driver_num][pos] = position_counts[driver_num].get(pos, 0) + 1
    
    # Calculate most likely positions
    for driver_num, counts in position_counts.items():
        if not counts:
            continue
        
        most_likely_pos = max(counts, key=counts.get)
        probability = (counts[most_likely_pos] / num_simulations) * 100
        
        current_pos = current_positions[driver_num]
        trend = 'up' if most_likely_pos < current_pos else ('down' if most_likely_pos > current_pos else 'stable')
        
        predictions.append({
            'driver': driver_num,
            'position': most_likely_pos,
            'probability': f"{probability:.1f}",
            'trend': trend
        })
    
    # Sort by predicted position
    predictions.sort(key=lambda x: x['position'])
    
    return predictions


def monte_carlo_pit_stops(drivers_data: List[Dict], current_lap: int, num_simulations: int = SIMULATIONS) -> List[Dict]:
    """
    Monte Carlo simulation for pit stop window predictions
    
    Args:
        drivers_data: List of driver data
        current_lap: Current lap number
        num_simulations: Number of Monte Carlo iterations
    
    Returns:
        List of predicted pit stop laps
    """
    predictions = []
    
    for driver in drivers_data:
        driver_num = driver.get('driver_number', 0)
        pit_stops = driver.get('pit_stops', [])
        
        # If driver hasn't pitted yet, predict when they will
        if not pit_stops:
            # Typical pit stop window: lap 15-25 for first stop
            simulated_laps = []
            for _ in range(num_simulations):
                predicted_lap = int(np.random.triangular(15, 20, 25))
                simulated_laps.append(predicted_lap)
            
            predicted_lap = int(np.median(simulated_laps))
            
            if predicted_lap > current_lap:
                predictions.append({
                    'driver': driver_num,
                    'predicted_lap': predicted_lap,
                    'confidence': f"{CONFIDENCE_THRESHOLD * 100:.0f}"
                })
    
    predictions.sort(key=lambda x: x['predicted_lap'])
    
    return predictions[:5]  # Return top 5 upcoming pit stops


def generate_predictions(session_key: str) -> Dict:
    """
    Main function to generate all predictions using Monte Carlo simulation
    
    Args:
        session_key: OpenF1 session key
    
    Returns:
        Dictionary containing all predictions
    """
    # Load session data
    session_data = load_session_data(session_key)
    
    # Generate mock data for demonstration
    # In production, this would use real data from OpenF1
    drivers_data = [
        {
            'driver_number': i,
            'position': i,
            'laps': [{'lap_duration': 90 + random.uniform(-2, 2)} for _ in range(10)],
            'pit_stops': [] if i % 4 == 0 else [{'lap': 15}]
        }
        for i in range(1, 21)
    ]
    
    # Run Monte Carlo simulations
    lap_time_predictions = monte_carlo_lap_times(drivers_data)
    position_predictions = monte_carlo_positions(drivers_data)
    pit_stop_predictions = monte_carlo_pit_stops(drivers_data, current_lap=10)
    
    # Compile results
    results = {
        'status': 'ready',
        'simulations': SIMULATIONS,
        'lapTimes': lap_time_predictions[:10],  # Top 10
        'positions': position_predictions[:10],  # Top 10
        'pitStops': pit_stop_predictions,
        'confidence': f"{CONFIDENCE_THRESHOLD * 100:.0f}"
    }
    
    return results


if __name__ == '__main__':
    # Get session key from command line argument
    session_key = sys.argv[1] if len(sys.argv) > 1 else '9161'
    
    # Generate predictions
    predictions = generate_predictions(session_key)
    
    # Output as JSON
    print(json.dumps(predictions, indent=2))

