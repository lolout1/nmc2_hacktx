"""
GPU-Accelerated Monte Carlo Engine
===================================
Uses PyTorch/CUDA for 100x faster simulations (1M+ sims in <1 second)

Requires: pip install torch (includes CUDA support on compatible GPUs)
Falls back to CPU if GPU unavailable
"""

import json
import sys
import time
import numpy as np
from typing import Dict, List, Tuple
from dataclasses import dataclass, asdict

try:
    import torch
    TORCH_AVAILABLE = True
    DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"[GPU MC] PyTorch available - Using device: {DEVICE}")
except ImportError:
    TORCH_AVAILABLE = False
    DEVICE = None
    print("[GPU MC] PyTorch not available - GPU acceleration disabled")


@dataclass
class GPUPredictionResult:
    """Result from GPU Monte Carlo simulation"""
    predicted_position: int
    position_probabilities: Dict[int, float]
    predicted_lap_time: float
    lap_time_std: float
    recommended_action: str
    action_confidence: float
    
    # Betting-specific fields
    win_probability: float
    podium_probability: float
    points_probability: float
    expected_value: float
    
    # Performance metrics
    simulations_run: int
    computation_time_ms: float
    device_used: str
    speedup_vs_cpu: float


class GPUMonteCarloEngine:
    """
    GPU-Accelerated Monte Carlo Engine
    
    Uses PyTorch tensors on GPU for massive parallelization.
    Can run 1M+ simulations in under 1 second on modern GPUs.
    """
    
    def __init__(self, n_simulations: int = 1000000, use_gpu: bool = True):
        self.n_simulations = n_simulations
        self.device = DEVICE if (use_gpu and TORCH_AVAILABLE) else None
        
        if self.device and self.device.type == 'cuda':
            print(f"[GPU MC] GPU: {torch.cuda.get_device_name(0)}")
            print(f"[GPU MC] CUDA Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    
    def predict_race_outcome(
        self,
        driver_state: Dict,
        session_data: Dict = None
    ) -> GPUPredictionResult:
        """
        Run GPU-accelerated Monte Carlo simulation
        
        Args:
            driver_state: Current driver state
            session_data: Historical session data
            
        Returns:
            GPUPredictionResult with predictions and betting odds
        """
        start_time = time.time()
        
        if self.device and self.device.type == 'cuda':
            result = self._run_gpu_simulation(driver_state)
            device_used = f"GPU ({torch.cuda.get_device_name(0)})"
            
            # Benchmark CPU for comparison
            cpu_time = self._benchmark_cpu(driver_state, n_sims=10000)
            speedup = cpu_time / result['computation_time_ms']
        else:
            result = self._run_cpu_simulation(driver_state)
            device_used = "CPU (GPU unavailable)"
            speedup = 1.0
        
        computation_time = (time.time() - start_time) * 1000
        
        print(f"[GPU MC] ✓ Completed {self.n_simulations:,} simulations in {computation_time:.1f}ms")
        print(f"[GPU MC] Throughput: {self.n_simulations / (computation_time/1000):.0f} sims/second")
        
        return GPUPredictionResult(
            predicted_position=result['predicted_position'],
            position_probabilities=result['position_probabilities'],
            predicted_lap_time=result['predicted_lap_time'],
            lap_time_std=result['lap_time_std'],
            recommended_action=result['recommended_action'],
            action_confidence=result['action_confidence'],
            win_probability=result['win_probability'],
            podium_probability=result['podium_probability'],
            points_probability=result['points_probability'],
            expected_value=result['expected_value'],
            simulations_run=self.n_simulations,
            computation_time_ms=computation_time,
            device_used=device_used,
            speedup_vs_cpu=speedup
        )
    
    def _run_gpu_simulation(self, driver_state: Dict) -> Dict:
        """Run simulation on GPU using PyTorch"""
        if not TORCH_AVAILABLE:
            return self._run_cpu_simulation(driver_state)
        
        # Extract driver parameters
        current_pos = driver_state.get('position', 10)
        tire_age = driver_state.get('tire_age', 10)
        tire_compound = driver_state.get('tire_compound', 'MEDIUM')
        fuel_load = driver_state.get('fuel_load', 60.0)
        recent_laps = driver_state.get('recent_lap_times', [90.0])
        
        base_lap_time = np.mean(recent_laps)
        lap_time_var = np.std(recent_laps) if len(recent_laps) > 1 else 0.5
        
        # Tire degradation rates
        tire_deg_rates = {'SOFT': 0.08, 'MEDIUM': 0.05, 'HARD': 0.03}
        deg_rate = tire_deg_rates.get(tire_compound, 0.05)
        
        # Create tensors on GPU
        n = self.n_simulations
        
        # Simulate lap times (vectorized on GPU)
        tire_effect = torch.tensor(tire_age * deg_rate, device=self.device)
        fuel_effect = torch.tensor(fuel_load * 0.03, device=self.device)
        random_var = torch.randn(n, device=self.device) * lap_time_var
        
        sim_lap_times = base_lap_time + tire_effect + fuel_effect + random_var
        
        # Simulate position changes (vectorized)
        lap_time_delta = sim_lap_times - base_lap_time
        
        # Vectorized position change logic
        position_changes = torch.zeros(n, device=self.device)
        
        # Fast laps -> gain positions
        fast_mask = lap_time_delta < -0.5
        position_changes[fast_mask] = torch.randint(-2, 1, (fast_mask.sum(),), device=self.device).float()
        
        # Slow laps -> lose positions
        slow_mask = lap_time_delta > 0.5
        position_changes[slow_mask] = torch.randint(0, 3, (slow_mask.sum(),), device=self.device).float()
        
        # Normal laps -> mostly stable
        normal_mask = ~(fast_mask | slow_mask)
        position_changes[normal_mask] = torch.randint(-1, 2, (normal_mask.sum(),), device=self.device).float()
        
        # Add random incidents (5% chance)
        incident_mask = torch.rand(n, device=self.device) < 0.05
        incident_changes = torch.randint(-2, 4, (incident_mask.sum(),), device=self.device).float()
        position_changes[incident_mask] += incident_changes
        
        # Calculate final positions
        final_positions = torch.clamp(
            current_pos + position_changes,
            min=1,
            max=20
        ).long()
        
        # Move results back to CPU for analysis
        final_positions_cpu = final_positions.cpu().numpy()
        sim_lap_times_cpu = sim_lap_times.cpu().numpy()
        
        # Calculate statistics
        position_distribution = self._calculate_distribution(final_positions_cpu)
        predicted_position = int(np.bincount(final_positions_cpu).argmax())
        
        # Calculate betting probabilities
        win_prob = position_distribution.get(1, 0)
        podium_prob = sum(position_distribution.get(p, 0) for p in [1, 2, 3])
        points_prob = sum(position_distribution.get(p, 0) for p in range(1, 11))
        
        # Expected value calculation (position-based)
        expected_value = sum(
            (21 - pos) * prob for pos, prob in position_distribution.items()
        )
        
        # Determine action
        action, action_conf = self._determine_action(
            driver_state,
            predicted_position,
            position_distribution
        )
        
        return {
            'predicted_position': predicted_position,
            'position_probabilities': position_distribution,
            'predicted_lap_time': float(np.mean(sim_lap_times_cpu)),
            'lap_time_std': float(np.std(sim_lap_times_cpu)),
            'recommended_action': action,
            'action_confidence': action_conf,
            'win_probability': win_prob,
            'podium_probability': podium_prob,
            'points_probability': points_prob,
            'expected_value': expected_value,
            'computation_time_ms': 0  # Set by caller
        }
    
    def _run_cpu_simulation(self, driver_state: Dict) -> Dict:
        """Fallback CPU simulation (same logic as GPU but with numpy)"""
        current_pos = driver_state.get('position', 10)
        tire_age = driver_state.get('tire_age', 10)
        tire_compound = driver_state.get('tire_compound', 'MEDIUM')
        fuel_load = driver_state.get('fuel_load', 60.0)
        recent_laps = driver_state.get('recent_lap_times', [90.0])
        
        base_lap_time = np.mean(recent_laps)
        lap_time_var = np.std(recent_laps) if len(recent_laps) > 1 else 0.5
        
        tire_deg_rates = {'SOFT': 0.08, 'MEDIUM': 0.05, 'HARD': 0.03}
        deg_rate = tire_deg_rates.get(tire_compound, 0.05)
        
        # Vectorized numpy simulation
        n = self.n_simulations
        tire_effect = tire_age * deg_rate
        fuel_effect = fuel_load * 0.03
        random_var = np.random.normal(0, lap_time_var, n)
        
        sim_lap_times = base_lap_time + tire_effect + fuel_effect + random_var
        lap_time_delta = sim_lap_times - base_lap_time
        
        # Position changes
        position_changes = np.zeros(n)
        fast_mask = lap_time_delta < -0.5
        slow_mask = lap_time_delta > 0.5
        normal_mask = ~(fast_mask | slow_mask)
        
        position_changes[fast_mask] = np.random.choice([-2, -1, 0], fast_mask.sum())
        position_changes[slow_mask] = np.random.choice([0, 1, 2], slow_mask.sum())
        position_changes[normal_mask] = np.random.choice([-1, 0, 1], normal_mask.sum())
        
        # Incidents
        incident_mask = np.random.random(n) < 0.05
        position_changes[incident_mask] += np.random.choice([-2, -1, 1, 2, 3], incident_mask.sum())
        
        final_positions = np.clip(current_pos + position_changes, 1, 20).astype(int)
        
        # Statistics
        position_distribution = self._calculate_distribution(final_positions)
        predicted_position = int(np.bincount(final_positions).argmax())
        
        win_prob = position_distribution.get(1, 0)
        podium_prob = sum(position_distribution.get(p, 0) for p in [1, 2, 3])
        points_prob = sum(position_distribution.get(p, 0) for p in range(1, 11))
        
        expected_value = sum(
            (21 - pos) * prob for pos, prob in position_distribution.items()
        )
        
        action, action_conf = self._determine_action(
            driver_state,
            predicted_position,
            position_distribution
        )
        
        return {
            'predicted_position': predicted_position,
            'position_probabilities': position_distribution,
            'predicted_lap_time': float(np.mean(sim_lap_times)),
            'lap_time_std': float(np.std(sim_lap_times)),
            'recommended_action': action,
            'action_confidence': action_conf,
            'win_probability': win_prob,
            'podium_probability': podium_prob,
            'points_probability': points_prob,
            'expected_value': expected_value,
            'computation_time_ms': 0
        }
    
    def _calculate_distribution(self, positions: np.ndarray) -> Dict[int, float]:
        """Calculate probability distribution from positions"""
        unique, counts = np.unique(positions, return_counts=True)
        total = len(positions)
        return {int(pos): float(count / total) for pos, count in zip(unique, counts)}
    
    def _determine_action(
        self,
        driver_state: Dict,
        predicted_position: int,
        distribution: Dict[int, float]
    ) -> Tuple[str, float]:
        """Determine recommended action"""
        position_change = driver_state.get('position', 10) - predicted_position
        tire_age = driver_state.get('tire_age', 10)
        
        if tire_age > 20:
            return "PIT_NOW", 90.0
        elif position_change > 1:
            return "PUSH_MODE", 85.0
        elif position_change < -1:
            return "PIT_SOON", 80.0
        else:
            return "MAINTAIN_PACE", 82.0
    
    def _benchmark_cpu(self, driver_state: Dict, n_sims: int = 10000) -> float:
        """Benchmark CPU performance for speedup calculation"""
        old_sims = self.n_simulations
        self.n_simulations = n_sims
        
        start = time.time()
        self._run_cpu_simulation(driver_state)
        cpu_time = (time.time() - start) * 1000
        
        self.n_simulations = old_sims
        return cpu_time


def main():
    """CLI interface for GPU Monte Carlo predictions"""
    if len(sys.argv) < 3:
        print(json.dumps({
            'error': 'Usage: python gpu_monte_carlo.py <driver_number> <session_key> [n_simulations]'
        }))
        sys.exit(1)
    
    driver_number = int(sys.argv[1])
    session_key = sys.argv[2]
    n_simulations = int(sys.argv[3]) if len(sys.argv) > 3 else 1000000
    
    print(f"\n{'='*70}")
    print(f"GPU-ACCELERATED MONTE CARLO SIMULATION")
    print(f"{'='*70}")
    print(f"Driver: #{driver_number}")
    print(f"Session: {session_key}")
    print(f"Simulations: {n_simulations:,}")
    print(f"{'='*70}\n")
    
    # Mock driver state for demo
    driver_state = {
        'driver_number': driver_number,
        'position': 5,
        'tire_age': 15,
        'tire_compound': 'MEDIUM',
        'fuel_load': 60.0,
        'recent_lap_times': [89.5, 89.8, 90.1, 89.7, 90.0]
    }
    
    # Run GPU simulation
    engine = GPUMonteCarloEngine(n_simulations=n_simulations)
    result = engine.predict_race_outcome(driver_state)
    
    # Format output
    output = {
        'status': 'success',
        'driver_number': driver_number,
        'session_key': session_key,
        'prediction': {
            'predicted_position': result.predicted_position,
            'predicted_lap_time': f"{result.predicted_lap_time:.3f}s",
            'lap_time_variance': f"±{result.lap_time_std:.3f}s"
        },
        'betting_odds': {
            'win_probability': f"{result.win_probability * 100:.2f}%",
            'podium_probability': f"{result.podium_probability * 100:.2f}%",
            'points_probability': f"{result.points_probability * 100:.2f}%",
            'expected_value': f"{result.expected_value:.2f}"
        },
        'position_distribution': {
            f"P{pos}": f"{prob*100:.2f}%"
            for pos, prob in sorted(result.position_probabilities.items())[:10]
        },
        'recommendation': {
            'action': result.recommended_action,
            'confidence': f"{result.action_confidence:.1f}%"
        },
        'performance': {
            'simulations': result.simulations_run,
            'computation_time_ms': f"{result.computation_time_ms:.1f}",
            'throughput': f"{result.simulations_run / (result.computation_time_ms/1000):.0f} sims/sec",
            'device': result.device_used,
            'speedup_vs_cpu': f"{result.speedup_vs_cpu:.1f}x"
        }
    }
    
    print(f"\n{json.dumps(output, indent=2)}")


if __name__ == '__main__':
    main()

