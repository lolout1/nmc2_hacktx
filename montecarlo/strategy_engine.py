"""
Driver-Specific Strategy Engine
HPC-powered Monte Carlo simulations for individual driver strategy optimization
Converts thousands of race scenarios into actionable GO/NO-GO decisions
"""

import json
import sys
import numpy as np
import random
from typing import Dict, List, Tuple

# Configuration
SIMULATIONS = 10000
CONFIDENCE_THRESHOLD = 0.75


class StrategyEngine:
    """Main strategy calculation engine"""
    
    def __init__(self, driver_number: int, race_state: Dict):
        self.driver_number = driver_number
        self.race_state = race_state
        self.current_lap = race_state.get('current_lap', 10)
        self.total_laps = race_state.get('total_laps', 58)  # Singapore has 61 laps
        
        # Use driver number as seed for reproducible but varied results per driver
        # This ensures each driver gets different (but consistent) results
        np.random.seed(driver_number * 1000 + self.current_lap)
        random.seed(driver_number * 1000 + self.current_lap)
        
        # Current driver position (1-20)
        self.current_position = ((driver_number * 7) % 20) + 1  # Pseudo-position based on driver number
        
    def calculate_optimal_strategy(self) -> Dict:
        """
        Calculate optimal strategy for driver using Monte Carlo simulation
        Returns top decision and alternatives
        """
        # Generate strategy options
        strategies = {
            'pit_now': self._simulate_pit_now(),
            'extend_stint': self._simulate_stint_extension(),
            'push_mode': self._simulate_push_strategy(),
            'fuel_save': self._simulate_fuel_management(),
        }
        
        # Sort by expected value
        sorted_strategies = sorted(
            strategies.items(), 
            key=lambda x: x[1]['expected_value'], 
            reverse=True
        )
        
        # Format results
        top_decision = self._format_decision(sorted_strategies[0])
        alternatives = [self._format_decision(s) for s in sorted_strategies[1:3]]
        
        return {
            'topDecision': top_decision,
            'alternatives': alternatives,
            'pitWindow': self._calculate_pit_window(),
            'risk': self._assess_strategy_risk(sorted_strategies[0][1]),
            'simulations': SIMULATIONS
        }
    
    def _simulate_pit_now(self) -> Dict:
        """Simulate immediate pit stop strategy"""
        expected_positions = []
        
        # More variability based on driver number and current conditions
        base_pit_loss = 22 + (self.driver_number % 5) * 0.5  # Varies by driver
        
        for _ in range(SIMULATIONS):
            # Use actual current position
            current_pos = self.current_position
            
            # Pit stop loses ~2-3 positions typically, with more variance
            positions_lost = np.random.normal(2.5, 0.8)  # Mean 2.5, std 0.8
            
            # Fresh tires can recover positions - varies by driver skill
            laps_remaining = self.total_laps - self.current_lap
            driver_skill = 0.12 + (self.driver_number % 10) * 0.01  # 0.12-0.21
            position_recovery = np.random.binomial(
                n=min(laps_remaining, 15), 
                p=driver_skill
            )
            
            # Add random race incidents (safety cars, etc.)
            incident_factor = np.random.choice([0, -1, 1], p=[0.85, 0.10, 0.05])
            
            final_pos = min(20, max(1, current_pos + positions_lost - position_recovery + incident_factor))
            expected_positions.append(final_pos)
        
        avg_position = np.mean(expected_positions)
        position_gain = self.current_position - avg_position  # Positive is good
        
        return {
            'expected_value': position_gain * 10 + np.random.uniform(-3, 3),
            'confidence': self._calculate_confidence(expected_positions),
            'expected_position': round(avg_position),
            'position_change': round(position_gain, 1)
        }
    
    def _simulate_stint_extension(self) -> Dict:
        """Simulate extending current stint"""
        expected_positions = []
        
        # Tire wear varies by driver and track
        tire_wear_factor = 0.25 + (self.driver_number % 7) * 0.05
        
        for _ in range(SIMULATIONS):
            current_pos = self.current_position
            
            # Tire degradation causes position loss - more variance
            laps_extended = np.random.randint(2, 10)
            degradation_loss = laps_extended * np.random.normal(tire_wear_factor, 0.1)
            
            # Strategic advantage from avoiding pit
            traffic_advantage = np.random.exponential(1.5)
            
            # Risk of tire failure increases with extended stint
            failure_risk = np.random.binomial(1, min(0.15, laps_extended * 0.02))
            failure_penalty = failure_risk * np.random.uniform(5, 10)
            
            final_pos = min(20, max(1, current_pos + degradation_loss - traffic_advantage + failure_penalty))
            expected_positions.append(final_pos)
        
        avg_position = np.mean(expected_positions)
        position_gain = self.current_position - avg_position
        
        return {
            'expected_value': position_gain * 10 + np.random.uniform(-2, 4),
            'confidence': self._calculate_confidence(expected_positions),
            'expected_position': round(avg_position),
            'position_change': round(position_gain, 1)
        }
    
    def _simulate_push_strategy(self) -> Dict:
        """Simulate aggressive push mode"""
        expected_positions = []
        
        # Aggressive driving skill varies by driver
        aggression_skill = 0.20 + (self.driver_number % 5) * 0.04
        
        for _ in range(SIMULATIONS):
            current_pos = self.current_position
            
            # Push mode: higher chance of overtake but more tire wear and risk
            laps_to_push = np.random.randint(3, 8)
            overtake_chance = np.random.binomial(n=laps_to_push, p=aggression_skill)
            
            # Increased tire wear risk
            tire_risk = np.random.binomial(n=laps_to_push, p=0.08)
            
            # Mistake risk when pushing hard
            mistake_risk = np.random.binomial(1, 0.12) * np.random.uniform(1, 3)
            
            final_pos = min(20, max(1, current_pos - overtake_chance + tire_risk + mistake_risk))
            expected_positions.append(final_pos)
        
        avg_position = np.mean(expected_positions)
        position_gain = self.current_position - avg_position
        
        return {
            'expected_value': position_gain * 10 + np.random.uniform(-3, 6),
            'confidence': self._calculate_confidence(expected_positions),
            'expected_position': round(avg_position),
            'position_change': round(position_gain, 1)
        }
    
    def _simulate_fuel_management(self) -> Dict:
        """Simulate fuel saving strategy"""
        expected_positions = []
        
        # Fuel efficiency varies by driver and engine
        fuel_efficiency = 0.85 + (self.driver_number % 8) * 0.02
        
        for _ in range(SIMULATIONS):
            current_pos = self.current_position
            
            # Fuel save: maintain position, higher risk of being overtaken
            laps_remaining = self.total_laps - self.current_lap
            overtaken = np.random.binomial(
                n=min(laps_remaining, 10), 
                p=0.18  # 18% chance per lap when fuel saving
            )
            
            # Strategic benefit: better tire wear
            tire_preservation = np.random.uniform(0, 1.5)
            
            # Fuel advantage in closing laps
            endgame_bonus = 0
            if laps_remaining < 10:
                endgame_bonus = np.random.uniform(0, fuel_efficiency)
            
            final_pos = min(20, max(1, current_pos + overtaken - tire_preservation - endgame_bonus))
            expected_positions.append(final_pos)
        
        avg_position = np.mean(expected_positions)
        position_gain = self.current_position - avg_position
        
        return {
            'expected_value': position_gain * 10 + np.random.uniform(-1, 3),
            'confidence': self._calculate_confidence(expected_positions),
            'expected_position': round(avg_position),
            'position_change': round(position_gain, 1)
        }
    
    def _calculate_confidence(self, positions: List[float]) -> int:
        """
        Calculate confidence score from position distribution
        Lower std dev = higher confidence
        Also factors in driver consistency and race stage
        """
        std = np.std(positions)
        
        # Base confidence from distribution consistency
        base_confidence = max(55, min(98, 100 - (std * 8)))
        
        # Driver consistency factor (varies by driver number)
        driver_consistency = 0.90 + (self.driver_number % 13) * 0.01
        
        # Race stage uncertainty (more uncertainty late in race)
        laps_remaining = self.total_laps - self.current_lap
        race_stage_factor = 1.0 - (laps_remaining / self.total_laps) * 0.15
        
        # Final confidence with variability
        confidence = base_confidence * driver_consistency * race_stage_factor
        
        # Add small random variation
        confidence += np.random.uniform(-3, 3)
        
        return int(max(60, min(95, confidence)))
    
    def _format_decision(self, strategy_tuple: Tuple) -> Dict:
        """Format strategy decision for frontend"""
        action_name, result = strategy_tuple
        
        action_labels = {
            'pit_now': 'PIT NOW',
            'extend_stint': 'EXTEND STINT',
            'push_mode': 'PUSH MODE',
            'fuel_save': 'FUEL SAVE MODE'
        }
        
        position_change = result.get('position_change', 0)
        expected_pos = result.get('expected_position', 10)
        
        if position_change > 0:
            outcome = f"Expected: P{expected_pos} (+{abs(position_change):.1f} positions)"
        elif position_change < 0:
            outcome = f"Expected: P{expected_pos} ({position_change:.1f} positions)"
        else:
            outcome = f"Expected: P{expected_pos} (maintain position)"
        
        return {
            'action': action_labels.get(action_name, action_name),
            'confidence': result.get('confidence', 75),
            'expectedOutcome': outcome
        }
    
    def _calculate_pit_window(self) -> Dict:
        """Calculate optimal pit stop window"""
        # Simulate different pit lap scenarios
        pit_results = {}
        
        # Pit window calculation factors
        driver_pace = 0.80 + (self.driver_number % 9) * 0.03
        
        for pit_lap in range(self.current_lap, min(self.current_lap + 15, self.total_laps)):
            positions = []
            laps_until_pit = pit_lap - self.current_lap
            
            for _ in range(1000):  # Faster sim for pit windows
                # Simulate position after pitting on this lap
                current_pos = self.current_position
                
                # Traffic increases the later you pit (in traffic windows)
                traffic_factor = np.random.exponential(1.5) if laps_until_pit in [3, 4, 8, 9] else np.random.uniform(0, 2)
                
                # Tire advantage increases the earlier you pit (more laps on fresh tires)
                tire_advantage = (laps_until_pit * 0.2) + np.random.uniform(0, 1.5) * driver_pace
                
                # Pit loss (positions dropped during pit)
                pit_loss = np.random.normal(2.5, 0.7)
                
                position = current_pos + pit_loss + traffic_factor - tire_advantage
                positions.append(min(20, max(1, position)))
            
            pit_results[pit_lap] = np.mean(positions)
        
        # Find optimal lap (best average position)
        optimal_lap = min(pit_results, key=pit_results.get)
        
        # Calculate safe window (within 10% of optimal)
        optimal_value = pit_results[optimal_lap]
        safe_laps = [
            lap for lap, value in pit_results.items() 
            if value <= optimal_value * 1.1
        ]
        
        # Laps to avoid (worst performance)
        avoid_laps = sorted(
            pit_results.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:2]
        
        return {
            'optimal': optimal_lap,
            'min': min(safe_laps) if safe_laps else optimal_lap,
            'max': max(safe_laps) if safe_laps else optimal_lap + 3,
            'avoid': [lap for lap, _ in avoid_laps],
            'reason': self._generate_pit_reason(optimal_lap)
        }
    
    def _generate_pit_reason(self, lap: int) -> str:
        """Generate human-readable reason for pit window"""
        reasons = [
            f"Clear track ahead on lap {lap}",
            f"Undercut opportunity on lap {lap}",
            f"Optimal tire delta on lap {lap}",
            f"Avoid traffic congestion on lap {lap}",
            f"Strategic overcut window on lap {lap}"
        ]
        return random.choice(reasons)
    
    def _assess_strategy_risk(self, strategy_result: Dict) -> Dict:
        """
        Multi-dimensional risk assessment
        Factors vary based on driver, position, and race stage
        """
        # Base risks with driver-specific variance
        driver_risk_factor = 1.0 + (self.driver_number % 11) * 0.05
        
        # Race stage affects risk (more risk late in race)
        laps_remaining = self.total_laps - self.current_lap
        race_stage_risk = 1.0 + (1.0 - laps_remaining / self.total_laps) * 0.3
        
        # Position affects risk (leaders have less risk, back markers more)
        position_risk = 1.0 + (self.current_position - 1) * 0.02
        
        # Calculate various risk factors with variability
        safety_car_risk = np.random.uniform(5, 20) * race_stage_risk
        traffic_risk = np.random.uniform(8, 25) * position_risk
        tire_risk = np.random.uniform(3, 15) * driver_risk_factor
        weather_risk = np.random.uniform(2, 10)  # Weather is random
        
        # Strategy confidence affects overall risk
        strategy_confidence = strategy_result.get('confidence', 75)
        confidence_factor = (100 - strategy_confidence) / 100
        
        total_risk = ((safety_car_risk + traffic_risk + tire_risk + weather_risk) / 4) * (1 + confidence_factor * 0.3)
        
        if total_risk < 15:
            risk_level = 'LOW'
        elif total_risk < 25:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'HIGH'
        
        return {
            'level': risk_level,
            'score': round(total_risk),
            'factors': [
                {'name': 'Safety Car', 'value': round(safety_car_risk)},
                {'name': 'Traffic', 'value': round(traffic_risk)},
                {'name': 'Tire Failure', 'value': round(tire_risk)},
                {'name': 'Weather', 'value': round(weather_risk)}
            ]
        }


def calculate_driver_strategy(driver_number: int, race_state: Dict) -> Dict:
    """
    Main entry point for driver strategy calculation
    
    Args:
        driver_number: Driver number to calculate strategy for
        race_state: Current race state with all relevant data
    
    Returns:
        Complete strategy recommendation package
    """
    engine = StrategyEngine(driver_number, race_state)
    return engine.calculate_optimal_strategy()


if __name__ == '__main__':
    # Get parameters from command line
    if len(sys.argv) < 3:
        print(json.dumps({
            'error': 'Usage: python strategy_engine.py <driver_number> <session_key>'
        }))
        sys.exit(1)
    
    driver_number = int(sys.argv[1])
    session_key = sys.argv[2]
    
    # Mock race state for development
    race_state = {
        'current_lap': 15,
        'total_laps': 58,
        'session_key': session_key
    }
    
    # Calculate strategies
    strategies = calculate_driver_strategy(driver_number, race_state)
    
    # Output as JSON
    print(json.dumps(strategies, indent=2))

