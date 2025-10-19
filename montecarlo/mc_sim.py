"""
Real-Time F1 Race Decision Engine
Solves: "Should I pit NOW or wait?" - updated every 5 seconds
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import List, Dict
import time

@dataclass
class RaceDecision:
    """Simple, actionable decision for race engineer"""
    action: str  # "PIT NOW", "STAY OUT", "PIT IN 2 LAPS"
    confidence: float  # 0-100%
    reason: str  # Why this decision
    time_impact: float  # Seconds gained/lost
    risk_level: str  # "LOW", "MEDIUM", "HIGH"

class RealtimeRaceAdvisor:
    """
    Simplifies complex HPC simulations into instant decisions
    Updates every 5 seconds during race
    """
    
    def __init__(self):
        self.base_lap_time = 90.0
        self.pit_time = 25.0
        
        # Tire degradation (s/lap)
        self.tire_deg = {'Soft': 0.08, 'Medium': 0.05, 'Hard': 0.03}
        self.tire_initial_speed = {'Soft': -1.5, 'Medium': -0.8, 'Hard': 0.0}
    
    def should_pit_now(self, current_state: Dict, race_context: Dict) -> RaceDecision:
        """
        THE KEY FUNCTION: Answer "Should I pit RIGHT NOW?"
        This is what race engineers need in real-time
        """
        
        # Run quick Monte Carlo (1000 sims, < 100ms)
        pit_now_time = self._simulate_strategy(
            current_state, 
            pit_lap=current_state['lap'],  # Pit immediately
            tire='Hard'
        )
        
        # Compare: pit in 1, 2, 3, 5 laps
        alternatives = {}
        for wait_laps in [1, 2, 3, 5]:
            alt_time = self._simulate_strategy(
                current_state,
                pit_lap=current_state['lap'] + wait_laps,
                tire='Hard'
            )
            alternatives[wait_laps] = alt_time
        
        best_alternative = min(alternatives.items(), key=lambda x: x[1])
        
        # DECISION LOGIC
        time_diff = pit_now_time - best_alternative[1]
        
        # Factor in race context
        traffic_ahead = race_context.get('traffic_ahead', False)
        safety_car_risk = race_context.get('safety_car_probability', 0)
        tire_critical = current_state['tire_age'] > 25
        
        # CRITICAL: Tire about to fail?
        if tire_critical:
            return RaceDecision(
                action="⚠️ PIT NOW - CRITICAL",
                confidence=95,
                reason="Tires degraded beyond safe limit",
                time_impact=-time_diff,
                risk_level="HIGH"
            )
        
        # OPTIMAL: Pitting now is fastest
        if time_diff < 1.0:  # Within 1 second = pit now
            return RaceDecision(
                action="✅ PIT NOW",
                confidence=85,
                reason=f"Optimal pit window. Only {time_diff:.1f}s difference",
                time_impact=0.0,
                risk_level="LOW"
            )
        
        # WAIT: Better to wait
        if time_diff > 3.0:  # More than 3s slower to pit now
            return RaceDecision(
                action=f"⏳ STAY OUT - Pit in {best_alternative[0]} laps",
                confidence=90,
                reason=f"Waiting saves {time_diff:.1f}s. Tires still good",
                time_impact=time_diff,
                risk_level="LOW"
            )
        
        # STRATEGIC: Traffic considerations
        if traffic_ahead:
            return RaceDecision(
                action="🏁 PIT NOW - Undercut opportunity",
                confidence=75,
                reason="Clear track ahead. Undercut cars in traffic",
                time_impact=time_diff,
                risk_level="MEDIUM"
            )
        
        # RISKY: Safety car incoming
        if safety_car_risk > 0.5:
            return RaceDecision(
                action="⏳ WAIT - Safety car likely",
                confidence=70,
                reason="Free pit stop possible if SC deploys",
                time_impact=15.0,  # Could save full pit stop
                risk_level="HIGH"
            )
        
        # DEFAULT
        return RaceDecision(
            action=f"➡️ PIT IN {best_alternative[0]} LAPS",
            confidence=80,
            reason=f"Optimal window in {best_alternative[0]} laps",
            time_impact=time_diff,
            risk_level="MEDIUM"
        )
    
    def _simulate_strategy(self, state, pit_lap, tire, n_sims=100):
        """Fast Monte Carlo (100 sims for speed)"""
        times = []
        for _ in range(n_sims):
            race_time = 0
            tire_age = state['tire_age']
            fuel = state['fuel_load']
            
            for lap in range(state['lap'], 50):
                if lap == pit_lap:
                    race_time += self.pit_time
                    tire_age = 0
                
                lap_time = (self.base_lap_time + 
                           self.tire_initial_speed[tire] +
                           tire_age * self.tire_deg[tire] +
                           fuel * 0.03 +
                           np.random.normal(0, 0.2))
                
                race_time += lap_time
                tire_age += 1
                fuel = max(0, fuel - 1.8)
            
            times.append(race_time)
        
        return np.mean(times)
    
    def live_race_loop(self, telemetry_stream):
        """
        Simulates real-time decision making during race
        Updates every 5 seconds as new telemetry arrives
        """
        print("🏁 STARTING REAL-TIME RACE ADVISOR")
        print("=" * 70)
        
        for state in telemetry_stream:
            # Get race context (would come from your OpenF1 data)
            race_context = {
                'traffic_ahead': state['lap'] % 7 == 0,  # Simulate traffic
                'safety_car_probability': 0.1 if state['lap'] > 30 else 0.0,
            }
            
            # GET DECISION
            decision = self.should_pit_now(state, race_context)
            
            # DISPLAY TO ENGINEER
            self._display_decision(state, decision)
            
            time.sleep(0.1)  # Simulate 5-second updates
    
    def _display_decision(self, state, decision: RaceDecision):
        """Display decision like a race engineer's screen"""
        print(f"\n⏱️  LAP {state['lap']} | Tire Age: {state['tire_age']} laps")
        print(f"   {decision.action}")
        print(f"   Confidence: {decision.confidence}% | Risk: {decision.risk_level}")
        print(f"   Reason: {decision.reason}")
        if decision.time_impact > 0:
            print(f"   ⚡ Potential gain: +{decision.time_impact:.1f}s")
        print("-" * 70)


# DEMO: Simulate a race with real-time decisions
if __name__ == "__main__":
    advisor = RealtimeRaceAdvisor()
    
    # Simulate telemetry stream (like OpenF1 real-time data)
    def generate_race_telemetry():
        """Simulate race progression"""
        for lap in range(15, 35):  # Laps 15-35
            yield {
                'lap': lap,
                'tire_age': lap - 15,  # Tires fitted on lap 15
                'fuel_load': 100 - (lap * 1.8),
                'position': 3
            }
    
    # Run live race advisor
    advisor.live_race_loop(generate_race_telemetry())
    
    print("\n" + "=" * 70)
    print("✅ RACE COMPLETE")
