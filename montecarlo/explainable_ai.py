"""
Explainable AI Decision Engine
================================
Converts complex Monte Carlo simulation results into human-readable
explanations that race engineers can understand and act upon.

This module addresses the F1 HPC challenge: "engineers struggle to quickly
interpret results" by providing clear, ranked explanations for every decision.
"""

import json
import sys
import numpy as np
from typing import Dict, List, Tuple
from dataclasses import dataclass, asdict


@dataclass
class ExplanationFactor:
    """A single factor contributing to a decision"""
    factor_name: str
    impact_score: float  # -100 to +100 (negative = against, positive = for)
    confidence: float  # 0 to 100
    description: str
    raw_value: float = None


@dataclass
class ExplainableDecision:
    """A decision with full explanation"""
    decision: str
    overall_confidence: float
    primary_factors: List[ExplanationFactor]
    risk_factors: List[ExplanationFactor]
    opportunity_factors: List[ExplanationFactor]
    summary: str
    alternatives_considered: List[Dict]


class ExplainableAI:
    """
    Explainable AI Engine for F1 Strategy Decisions
    
    Takes raw simulation data and produces human-readable explanations
    that answer: "WHY should we make this decision?"
    """
    
    def __init__(self):
        self.factor_weights = {
            'tire_age': 1.0,
            'tire_compound': 0.8,
            'position': 1.2,
            'gap_ahead': 0.9,
            'gap_behind': 0.7,
            'fuel_load': 0.6,
            'weather': 0.9,
            'safety_car_risk': 0.8,
            'traffic': 0.85,
            'lap_time_trend': 1.1
        }
    
    def explain_decision(
        self,
        decision: str,
        driver_state: Dict,
        simulation_results: Dict,
        session_data: Dict
    ) -> ExplainableDecision:
        """
        Generate comprehensive explanation for a strategy decision
        
        Args:
            decision: The recommended action (e.g., "PIT_NOW")
            driver_state: Current driver state
            simulation_results: Monte Carlo simulation results
            session_data: Historical session data
            
        Returns:
            ExplainableDecision with ranked factors and explanations
        """
        
        # Analyze all factors
        all_factors = self._analyze_factors(driver_state, simulation_results, session_data)
        
        # Separate into categories
        primary_factors = self._get_primary_factors(all_factors, decision)
        risk_factors = self._get_risk_factors(all_factors)
        opportunity_factors = self._get_opportunity_factors(all_factors)
        
        # Generate natural language summary
        summary = self._generate_summary(decision, primary_factors, driver_state)
        
        # Consider alternatives
        alternatives = self._explain_alternatives(decision, all_factors, driver_state)
        
        # Calculate overall confidence
        overall_confidence = self._calculate_confidence(primary_factors, risk_factors)
        
        return ExplainableDecision(
            decision=decision,
            overall_confidence=overall_confidence,
            primary_factors=primary_factors[:5],  # Top 5 factors
            risk_factors=risk_factors[:3],  # Top 3 risks
            opportunity_factors=opportunity_factors[:3],  # Top 3 opportunities
            summary=summary,
            alternatives_considered=alternatives
        )
    
    def _analyze_factors(
        self,
        driver_state: Dict,
        simulation_results: Dict,
        session_data: Dict
    ) -> List[ExplanationFactor]:
        """Analyze all factors contributing to decision"""
        factors = []
        
        # 1. TIRE AGE ANALYSIS
        tire_age = driver_state.get('tire_age', 0)
        if tire_age > 20:
            impact = min(100, (tire_age - 20) * 5)
            factors.append(ExplanationFactor(
                factor_name='Tire Age - Critical',
                impact_score=impact,
                confidence=95,
                description=f'Tires are {tire_age} laps old - approaching failure risk',
                raw_value=tire_age
            ))
        elif tire_age > 15:
            impact = (tire_age - 15) * 10
            factors.append(ExplanationFactor(
                factor_name='Tire Age - High',
                impact_score=impact,
                confidence=85,
                description=f'Tires at {tire_age} laps - degradation increasing',
                raw_value=tire_age
            ))
        else:
            impact = -20  # Fresh tires favor staying out
            factors.append(ExplanationFactor(
                factor_name='Tire Age - Good',
                impact_score=impact,
                confidence=80,
                description=f'Tires only {tire_age} laps old - still performing well',
                raw_value=tire_age
            ))
        
        # 2. LAP TIME TREND ANALYSIS
        recent_laps = driver_state.get('recent_lap_times', [])
        if len(recent_laps) >= 3:
            lap_trend = self._calculate_lap_time_trend(recent_laps)
            if lap_trend > 0.2:  # Getting slower
                impact = min(80, lap_trend * 100)
                factors.append(ExplanationFactor(
                    factor_name='Lap Time Degradation',
                    impact_score=impact,
                    confidence=90,
                    description=f'Lap times degrading by {lap_trend:.3f}s per lap',
                    raw_value=lap_trend
                ))
            elif lap_trend < -0.1:  # Getting faster
                impact = -60
                factors.append(ExplanationFactor(
                    factor_name='Lap Time Improvement',
                    impact_score=impact,
                    confidence=85,
                    description=f'Lap times improving by {abs(lap_trend):.3f}s per lap',
                    raw_value=lap_trend
                ))
        
        # 3. POSITION ANALYSIS
        position = driver_state.get('position', 10)
        predicted_pos = simulation_results.get('predicted_position', position)
        position_change = position - predicted_pos
        
        if position_change > 1:
            impact = -50  # Good position trend, stay out
            factors.append(ExplanationFactor(
                factor_name='Position Gain Expected',
                impact_score=impact,
                confidence=80,
                description=f'Likely to gain {position_change} positions without pitting',
                raw_value=position_change
            ))
        elif position_change < -1:
            impact = 60
            factors.append(ExplanationFactor(
                factor_name='Position Loss Risk',
                impact_score=impact,
                confidence=75,
                description=f'Risk losing {abs(position_change)} positions if staying out',
                raw_value=position_change
            ))
        
        # 4. FUEL LOAD ANALYSIS
        fuel_load = driver_state.get('fuel_load', 50)
        if fuel_load < 20:
            impact = -40  # Low fuel favors staying out
            factors.append(ExplanationFactor(
                factor_name='Low Fuel Load',
                impact_score=impact,
                confidence=70,
                description=f'Fuel at {fuel_load:.1f}% - car is light and fast',
                raw_value=fuel_load
            ))
        elif fuel_load > 60:
            impact = 30
            factors.append(ExplanationFactor(
                factor_name='High Fuel Load',
                impact_score=impact,
                confidence=65,
                description=f'Fuel at {fuel_load:.1f}% - car is heavy, limiting pace',
                raw_value=fuel_load
            ))
        
        # 5. TRAFFIC ANALYSIS
        traffic_density = self._estimate_traffic(driver_state, session_data)
        if traffic_density > 0.7:
            impact = 70  # Heavy traffic favors pitting
            factors.append(ExplanationFactor(
                factor_name='Heavy Traffic',
                impact_score=impact,
                confidence=75,
                description='Heavy traffic ahead - pit to undercut',
                raw_value=traffic_density
            ))
        elif traffic_density < 0.3:
            impact = -50  # Clear track favors pushing
            factors.append(ExplanationFactor(
                factor_name='Clear Track',
                impact_score=impact,
                confidence=80,
                description='Clear track ahead - opportunity to push',
                raw_value=traffic_density
            ))
        
        # 6. PIT STOP HISTORY
        pit_stops = driver_state.get('pit_stops_made', 0)
        if pit_stops == 0:
            impact = 40
            factors.append(ExplanationFactor(
                factor_name='No Pit Stops Yet',
                impact_score=impact,
                confidence=90,
                description='Must pit at least once - window approaching',
                raw_value=pit_stops
            ))
        
        # 7. LAP TIME VARIANCE (CONSISTENCY)
        if recent_laps and len(recent_laps) > 2:
            variance = np.std(recent_laps)
            if variance > 0.5:
                impact = 35
                factors.append(ExplanationFactor(
                    factor_name='Inconsistent Pace',
                    impact_score=impact,
                    confidence=70,
                    description=f'Lap times varying by ±{variance:.3f}s - possible tire issues',
                    raw_value=variance
                ))
            elif variance < 0.2:
                impact = -30
                factors.append(ExplanationFactor(
                    factor_name='Consistent Pace',
                    impact_score=impact,
                    confidence=85,
                    description=f'Consistent lap times (±{variance:.3f}s) - car performing well',
                    raw_value=variance
                ))
        
        return sorted(factors, key=lambda f: abs(f.impact_score), reverse=True)
    
    def _calculate_lap_time_trend(self, lap_times: List[float]) -> float:
        """Calculate lap time trend (positive = getting slower)"""
        if len(lap_times) < 2:
            return 0.0
        
        # Simple linear regression
        x = np.arange(len(lap_times))
        y = np.array(lap_times)
        
        # Slope = trend
        slope = np.polyfit(x, y, 1)[0]
        return slope
    
    def _estimate_traffic(self, driver_state: Dict, session_data: Dict) -> float:
        """Estimate traffic density (0-1)"""
        # Simplified traffic estimation
        position = driver_state.get('position', 10)
        
        # More traffic in midfield
        if 5 <= position <= 15:
            return 0.7 + np.random.uniform(-0.1, 0.1)
        elif position <= 3:
            return 0.2 + np.random.uniform(-0.1, 0.1)
        else:
            return 0.5 + np.random.uniform(-0.2, 0.2)
    
    def _get_primary_factors(self, factors: List[ExplanationFactor], decision: str) -> List[ExplanationFactor]:
        """Get factors that support the decision"""
        if 'PIT' in decision:
            # Factors with positive impact support pitting
            return [f for f in factors if f.impact_score > 20]
        else:
            # Factors with negative impact support staying out
            return [f for f in factors if f.impact_score < -20]
    
    def _get_risk_factors(self, factors: List[ExplanationFactor]) -> List[ExplanationFactor]:
        """Get risk factors regardless of decision"""
        risks = []
        for factor in factors:
            if 'Critical' in factor.factor_name or 'Risk' in factor.factor_name or 'Loss' in factor.factor_name:
                risks.append(factor)
        return risks
    
    def _get_opportunity_factors(self, factors: List[ExplanationFactor]) -> List[ExplanationFactor]:
        """Get opportunity factors"""
        opportunities = []
        for factor in factors:
            if 'Gain' in factor.factor_name or 'Clear' in factor.factor_name or 'Improvement' in factor.factor_name:
                opportunities.append(factor)
        return opportunities
    
    def _generate_summary(self, decision: str, factors: List[ExplanationFactor], driver_state: Dict) -> str:
        """Generate natural language summary"""
        if not factors:
            return f"Recommendation: {decision.replace('_', ' ')}"
        
        top_factor = factors[0]
        driver_num = driver_state.get('driver_number', 'X')
        position = driver_state.get('position', 'X')
        
        summaries = {
            'PIT_NOW': f"Driver #{driver_num} (P{position}) should pit immediately. Primary reason: {top_factor.description}",
            'PIT_SOON': f"Driver #{driver_num} (P{position}) should pit within 2-3 laps. Primary reason: {top_factor.description}",
            'PUSH_MODE': f"Driver #{driver_num} (P{position}) should push hard. Primary reason: {top_factor.description}",
            'MAINTAIN_PACE': f"Driver #{driver_num} (P{position}) should maintain current pace. Primary reason: {top_factor.description}",
            'FUEL_SAVE': f"Driver #{driver_num} (P{position}) should save fuel. Primary reason: {top_factor.description}",
            'EXTEND_STINT': f"Driver #{driver_num} (P{position}) should extend current stint. Primary reason: {top_factor.description}"
        }
        
        return summaries.get(decision, f"Recommendation: {decision} - {top_factor.description}")
    
    def _explain_alternatives(self, chosen: str, factors: List[ExplanationFactor], driver_state: Dict) -> List[Dict]:
        """Explain why alternatives were not chosen"""
        alternatives = ['PIT_NOW', 'PIT_SOON', 'PUSH_MODE', 'MAINTAIN_PACE']
        alternatives = [a for a in alternatives if a != chosen][:2]  # Top 2 alternatives
        
        explained = []
        for alt in alternatives:
            # Calculate score for this alternative
            score = sum(f.impact_score for f in factors if self._factor_supports_action(f, alt))
            
            explained.append({
                'action': alt,
                'score': score,
                'reason': f"Less favorable than {chosen} by {abs(score):.1f} points"
            })
        
        return explained
    
    def _factor_supports_action(self, factor: ExplanationFactor, action: str) -> bool:
        """Check if factor supports an action"""
        if 'PIT' in action:
            return factor.impact_score > 0
        else:
            return factor.impact_score < 0
    
    def _calculate_confidence(self, primary: List[ExplanationFactor], risks: List[ExplanationFactor]) -> float:
        """Calculate overall confidence in decision"""
        if not primary:
            return 50.0
        
        # Average confidence of primary factors
        avg_confidence = np.mean([f.confidence for f in primary[:3]])
        
        # Reduce confidence for high risks
        risk_penalty = sum(abs(r.impact_score) for r in risks) * 0.1
        
        final_confidence = max(60, min(95, avg_confidence - risk_penalty))
        return round(final_confidence, 1)


def explain_strategy_decision(
    decision: str,
    driver_state: Dict,
    simulation_results: Dict,
    session_data: Dict = None
) -> Dict:
    """
    Main function: Explain a strategy decision
    
    Args:
        decision: The recommended action
        driver_state: Current driver state
        simulation_results: Monte Carlo results
        session_data: Optional session data
        
    Returns:
        Dictionary with complete explanation
    """
    engine = ExplainableAI()
    explanation = engine.explain_decision(
        decision,
        driver_state,
        simulation_results,
        session_data or {}
    )
    
    return asdict(explanation)


if __name__ == '__main__':
    # CLI interface
    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'Usage: python explainable_ai.py <decision_json>'
        }))
        sys.exit(1)
    
    # Parse input JSON
    input_data = json.loads(sys.argv[1])
    
    decision = input_data.get('decision', 'PIT_NOW')
    driver_state = input_data.get('driver_state', {})
    simulation_results = input_data.get('simulation_results', {})
    session_data = input_data.get('session_data', {})
    
    # Generate explanation
    explanation = explain_strategy_decision(
        decision,
        driver_state,
        simulation_results,
        session_data
    )
    
    # Output as JSON
    print(json.dumps(explanation, indent=2))

