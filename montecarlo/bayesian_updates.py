"""
Bayesian Real-Time Update System
==================================
Continuously refines race predictions as new telemetry data arrives.

This implements a Bayesian learning system that:
1. Starts with prior predictions from Monte Carlo simulations
2. Updates beliefs as actual lap times come in
3. Provides increasingly accurate predictions as race progresses

Addresses the F1 HPC challenge: Real-time decision-making with live data.
"""

import json
import sys
import numpy as np
from typing import Dict, List, Tuple
from dataclasses import dataclass, asdict
from collections import deque


@dataclass
class BayesianPrediction:
    """A prediction with Bayesian confidence bounds"""
    mean: float
    std: float
    confidence_lower: float
    confidence_upper: float
    confidence_level: float
    samples_used: int


@dataclass
class UpdateResult:
    """Result from Bayesian update"""
    predicted_lap_time: BayesianPrediction
    predicted_position: BayesianPrediction
    actual_vs_predicted: Dict
    confidence_evolution: List[float]
    learning_rate: float
    convergence_status: str


class BayesianRacePredictor:
    """
    Bayesian Learning System for F1 Race Predictions
    
    Updates predictions in real-time as actual race data arrives,
    providing increasingly accurate forecasts as more data is observed.
    """
    
    def __init__(self, prior_mean: float = 90.0, prior_std: float = 2.0):
        """
        Initialize Bayesian predictor
        
        Args:
            prior_mean: Initial belief about lap time (seconds)
            prior_std: Initial uncertainty (seconds)
        """
        self.prior_mean = prior_mean
        self.prior_std = prior_std
        
        # Track prediction history
        self.prediction_history = deque(maxlen=50)
        self.actual_history = deque(maxlen=50)
        self.confidence_history = deque(maxlen=50)
        
        # Current posterior (updated belief)
        self.posterior_mean = prior_mean
        self.posterior_std = prior_std
        
    def update_with_observation(
        self,
        actual_lap_time: float,
        observation_noise: float = 0.3
    ) -> BayesianPrediction:
        """
        Update prediction with new observation (Bayesian update rule)
        
        Args:
            actual_lap_time: Observed lap time
            observation_noise: Measurement uncertainty
            
        Returns:
            Updated Bayesian prediction
        """
        # Bayesian update formula (conjugate prior)
        prior_precision = 1 / (self.posterior_std ** 2)
        obs_precision = 1 / (observation_noise ** 2)
        
        # Posterior precision (inverse variance)
        posterior_precision = prior_precision + obs_precision
        
        # Posterior mean (weighted average of prior and observation)
        self.posterior_mean = (
            (prior_precision * self.posterior_mean + obs_precision * actual_lap_time)
            / posterior_precision
        )
        
        # Posterior standard deviation
        self.posterior_std = np.sqrt(1 / posterior_precision)
        
        # Calculate 90% confidence interval
        z_score = 1.645  # 90% confidence
        confidence_lower = self.posterior_mean - z_score * self.posterior_std
        confidence_upper = self.posterior_mean + z_score * self.posterior_std
        
        # Store history
        self.actual_history.append(actual_lap_time)
        self.prediction_history.append(self.posterior_mean)
        self.confidence_history.append(self.posterior_std)
        
        return BayesianPrediction(
            mean=self.posterior_mean,
            std=self.posterior_std,
            confidence_lower=confidence_lower,
            confidence_upper=confidence_upper,
            confidence_level=0.90,
            samples_used=len(self.actual_history)
        )
    
    def predict_next_lap(self) -> BayesianPrediction:
        """
        Predict next lap time based on current posterior
        """
        # If we have trend data, incorporate it
        if len(self.actual_history) >= 3:
            recent_laps = list(self.actual_history)[-3:]
            trend = np.polyfit(range(len(recent_laps)), recent_laps, 1)[0]
            
            # Adjust prediction for trend
            adjusted_mean = self.posterior_mean + trend
        else:
            adjusted_mean = self.posterior_mean
        
        z_score = 1.645
        return BayesianPrediction(
            mean=adjusted_mean,
            std=self.posterior_std,
            confidence_lower=adjusted_mean - z_score * self.posterior_std,
            confidence_upper=adjusted_mean + z_score * self.posterior_std,
            confidence_level=0.90,
            samples_used=len(self.actual_history)
        )
    
    def calculate_accuracy(self) -> Dict:
        """Calculate prediction accuracy metrics"""
        if len(self.prediction_history) < 2:
            return {
                'mae': 0.0,
                'rmse': 0.0,
                'samples': 0
            }
        
        predictions = np.array(list(self.prediction_history)[:-1])  # Past predictions
        actuals = np.array(list(self.actual_history)[1:])  # Future actuals
        
        if len(predictions) != len(actuals):
            min_len = min(len(predictions), len(actuals))
            predictions = predictions[:min_len]
            actuals = actuals[:min_len]
        
        mae = np.mean(np.abs(predictions - actuals))
        rmse = np.sqrt(np.mean((predictions - actuals) ** 2))
        
        return {
            'mae': round(mae, 3),
            'rmse': round(rmse, 3),
            'samples': len(predictions)
        }


class RealTimeLapTimePredictor:
    """
    Real-Time Lap Time Prediction System
    
    Combines Bayesian updates with HPC Monte Carlo simulations
    to provide the best of both worlds:
    - Monte Carlo: Explores many scenarios
    - Bayesian: Learns from actual outcomes
    """
    
    def __init__(self, monte_carlo_predictions: Dict = None):
        """
        Initialize with prior from Monte Carlo simulations
        
        Args:
            monte_carlo_predictions: Results from parallel Monte Carlo
        """
        if monte_carlo_predictions:
            prior_mean = monte_carlo_predictions.get('expected_lap_time', 90.0)
            prior_std = monte_carlo_predictions.get('lap_time_std', 1.0)
        else:
            prior_mean = 90.0
            prior_std = 2.0
        
        self.bayesian_predictor = BayesianRacePredictor(prior_mean, prior_std)
        self.monte_carlo_baseline = monte_carlo_predictions
        
    def update_with_actual_lap(
        self,
        lap_number: int,
        actual_lap_time: float,
        driver_number: int
    ) -> UpdateResult:
        """
        Update predictions with actual lap data
        
        Args:
            lap_number: Lap number
            actual_lap_time: Actual time from OpenF1 data
            driver_number: Driver number
            
        Returns:
            UpdateResult with updated predictions and comparison
        """
        # Update Bayesian model
        updated_prediction = self.bayesian_predictor.update_with_observation(actual_lap_time)
        
        # Predict next lap
        next_lap_prediction = self.bayesian_predictor.predict_next_lap()
        
        # Calculate learning progress
        accuracy = self.bayesian_predictor.calculate_accuracy()
        
        # Determine convergence status
        convergence = self._assess_convergence()
        
        # Compare actual vs predicted
        comparison = self._compare_actual_vs_predicted(actual_lap_time)
        
        # Calculate learning rate
        learning_rate = self._calculate_learning_rate()
        
        return UpdateResult(
            predicted_lap_time=next_lap_prediction,
            predicted_position=self._estimate_position_from_lap_time(next_lap_prediction.mean),
            actual_vs_predicted=comparison,
            confidence_evolution=list(self.bayesian_predictor.confidence_history),
            learning_rate=learning_rate,
            convergence_status=convergence
        )
    
    def _compare_actual_vs_predicted(self, actual: float) -> Dict:
        """Compare actual lap time to prediction"""
        if len(self.bayesian_predictor.prediction_history) < 2:
            return {
                'actual': actual,
                'predicted': None,
                'error': None,
                'error_percentage': None
            }
        
        predicted = self.bayesian_predictor.prediction_history[-2]  # Previous prediction
        error = actual - predicted
        error_pct = (error / predicted) * 100
        
        return {
            'actual': round(actual, 3),
            'predicted': round(predicted, 3),
            'error': round(error, 3),
            'error_percentage': round(error_pct, 2),
            'within_confidence_interval': self._check_within_ci(actual)
        }
    
    def _check_within_ci(self, actual: float) -> bool:
        """Check if actual value is within confidence interval"""
        if len(self.bayesian_predictor.prediction_history) < 2:
            return True
        
        last_pred = self.bayesian_predictor.predict_next_lap()
        return last_pred.confidence_lower <= actual <= last_pred.confidence_upper
    
    def _assess_convergence(self) -> str:
        """Assess if predictions have converged"""
        if len(self.bayesian_predictor.confidence_history) < 5:
            return "WARMING_UP"
        
        recent_stds = list(self.bayesian_predictor.confidence_history)[-5:]
        std_trend = recent_stds[-1] - recent_stds[0]
        
        if recent_stds[-1] < 0.3:
            return "CONVERGED_HIGH_CONFIDENCE"
        elif std_trend < -0.1:
            return "CONVERGING"
        elif recent_stds[-1] < 0.5:
            return "CONVERGED_MEDIUM_CONFIDENCE"
        else:
            return "LEARNING"
    
    def _calculate_learning_rate(self) -> float:
        """Calculate how fast the model is learning"""
        if len(self.bayesian_predictor.confidence_history) < 3:
            return 1.0
        
        stds = list(self.bayesian_predictor.confidence_history)
        improvement = (stds[0] - stds[-1]) / stds[0] if stds[0] > 0 else 0
        
        return max(0, min(1, improvement))
    
    def _estimate_position_from_lap_time(self, lap_time: float) -> BayesianPrediction:
        """Estimate position based on lap time (simplified)"""
        # This is a simplified model - in reality, you'd compare with other drivers
        # Assume average lap time is 90s, every 0.5s = 1 position
        base_position = 10
        time_delta = lap_time - 90.0
        position_change = time_delta / 0.5
        
        estimated_position = max(1, min(20, base_position + position_change))
        
        return BayesianPrediction(
            mean=estimated_position,
            std=1.5,
            confidence_lower=max(1, estimated_position - 2),
            confidence_upper=min(20, estimated_position + 2),
            confidence_level=0.80,
            samples_used=len(self.bayesian_predictor.actual_history)
        )


def process_lap_sequence(
    lap_times: List[Tuple[int, float]],
    driver_number: int,
    monte_carlo_prior: Dict = None
) -> List[Dict]:
    """
    Process a sequence of lap times and show Bayesian updates
    
    Args:
        lap_times: List of (lap_number, lap_time) tuples
        driver_number: Driver number
        monte_carlo_prior: Prior from Monte Carlo simulation
        
    Returns:
        List of update results for each lap
    """
    predictor = RealTimeLapTimePredictor(monte_carlo_prior)
    results = []
    
    for lap_num, lap_time in lap_times:
        result = predictor.update_with_actual_lap(lap_num, lap_time, driver_number)
        
        results.append({
            'lap_number': lap_num,
            'actual_lap_time': lap_time,
            'predicted_next_lap': asdict(result.predicted_lap_time),
            'comparison': result.actual_vs_predicted,
            'convergence': result.convergence_status,
            'learning_rate': round(result.learning_rate, 3)
        })
    
    return results


if __name__ == '__main__':
    # CLI interface
    if len(sys.argv) < 2:
        # Demo mode
        print("Running Bayesian Update Demo...")
        
        # Simulate lap times with some variation
        true_lap_time = 90.0
        lap_times = [(i, true_lap_time + np.random.normal(0, 0.5)) for i in range(1, 11)]
        
        # Prior from "Monte Carlo"
        mc_prior = {
            'expected_lap_time': 91.0,  # Slightly off
            'lap_time_std': 1.5
        }
        
        results = process_lap_sequence(lap_times, driver_number=1, monte_carlo_prior=mc_prior)
        
        print(json.dumps(results, indent=2))
    else:
        # Parse input
        input_data = json.loads(sys.argv[1])
        
        lap_times = input_data.get('lap_times', [])
        driver_number = input_data.get('driver_number', 1)
        mc_prior = input_data.get('monte_carlo_prior')
        
        results = process_lap_sequence(lap_times, driver_number, mc_prior)
        
        print(json.dumps(results, indent=2))

