"""
Test Script for Parallel Monte Carlo Engine
============================================
Quick test to verify the parallel Monte Carlo engine is working correctly.

Run with: python montecarlo/test_parallel_mc.py
"""

import sys
import time
from parallel_monte_carlo import (
    ParallelMonteCarloEngine,
    SimulationConfig,
    DriverState,
    load_openf1_session_data,
    extract_driver_state
)


def test_basic_functionality():
    """Test basic parallel Monte Carlo functionality"""
    print("\n" + "="*70)
    print("TEST 1: Basic Functionality")
    print("="*70)
    
    # Create test driver state
    driver_state = DriverState(
        driver_number=1,
        current_lap=20,
        position=3,
        tire_age=15,
        tire_compound='MEDIUM',
        fuel_load=60.0,
        recent_lap_times=[89.5, 89.8, 90.1, 89.7, 90.0],
        pit_stops_made=1
    )
    
    # Create engine with fewer simulations for quick test
    config = SimulationConfig(n_simulations=10000)
    engine = ParallelMonteCarloEngine(config)
    
    # Run prediction
    session_data = {'session_key': 'test'}
    result = engine.predict_race_outcome(driver_state, session_data)
    
    print(f"\n✓ Prediction completed successfully!")
    print(f"  Predicted Position: P{result.predicted_position}")
    print(f"  Confidence: {result.confidence:.1f}%")
    print(f"  Recommended Action: {result.recommended_action}")
    print(f"  Simulations: {result.simulations_run:,}")
    print(f"  Computation Time: {result.computation_time_ms:.1f}ms")
    print(f"  Throughput: {result.simulations_run / (result.computation_time_ms/1000):.0f} sims/sec")
    
    return True


def test_scalability():
    """Test scalability with increasing simulation counts"""
    print("\n" + "="*70)
    print("TEST 2: Scalability Test")
    print("="*70)
    
    driver_state = DriverState(
        driver_number=44,
        current_lap=15,
        position=5,
        tire_age=10,
        tire_compound='SOFT',
        fuel_load=70.0,
        recent_lap_times=[88.0, 88.5, 88.2],
        pit_stops_made=0
    )
    
    session_data = {'session_key': 'test'}
    sim_counts = [1000, 10000, 50000, 100000]
    
    print(f"\n{'Simulations':<15} {'Time (ms)':<15} {'Throughput (sims/s)':<25}")
    print("-" * 55)
    
    for n_sims in sim_counts:
        config = SimulationConfig(n_simulations=n_sims)
        engine = ParallelMonteCarloEngine(config)
        
        result = engine.predict_race_outcome(driver_state, session_data)
        throughput = result.simulations_run / (result.computation_time_ms / 1000)
        
        print(f"{n_sims:,:<15} {result.computation_time_ms:<15.1f} {throughput:,.0f}")
    
    print("\n✓ Scalability test completed!")
    return True


def test_with_real_data():
    """Test with real OpenF1 session data if available"""
    print("\n" + "="*70)
    print("TEST 3: Real Data Integration")
    print("="*70)
    
    # Try to load session 9161 (Singapore GP)
    session_key = '9161'
    print(f"\nAttempting to load session {session_key}...")
    
    session_data = load_openf1_session_data(session_key)
    
    if not session_data.get('laps'):
        print("⚠ No lap data found - cache may not exist yet")
        print("This is OK - the engine will use default values")
    else:
        print(f"✓ Loaded session data:")
        print(f"  Laps: {len(session_data.get('laps', []))}")
        print(f"  Car data: {len(session_data.get('car_data', []))}")
        print(f"  Pit stops: {len(session_data.get('pit_stops', []))}")
    
    # Extract driver state for driver #1 (Max Verstappen)
    driver_state = extract_driver_state(1, session_data)
    
    print(f"\n✓ Driver state extracted:")
    print(f"  Driver: #{driver_state.driver_number}")
    print(f"  Lap: {driver_state.current_lap}")
    print(f"  Position: P{driver_state.position}")
    print(f"  Tire Age: {driver_state.tire_age} laps")
    print(f"  Recent Laps: {len(driver_state.recent_lap_times)}")
    
    # Run prediction
    config = SimulationConfig(n_simulations=50000)
    engine = ParallelMonteCarloEngine(config)
    result = engine.predict_race_outcome(driver_state, session_data)
    
    print(f"\n✓ Prediction with real data:")
    print(f"  Predicted Position: P{result.predicted_position}")
    print(f"  Confidence: {result.confidence:.1f}%")
    print(f"  Computation Time: {result.computation_time_ms:.1f}ms")
    
    return True


def run_all_tests():
    """Run all tests"""
    print("\n" + "="*70)
    print("PARALLEL MONTE CARLO ENGINE - TEST SUITE")
    print("="*70)
    
    tests = [
        ("Basic Functionality", test_basic_functionality),
        ("Scalability", test_scalability),
        ("Real Data Integration", test_with_real_data)
    ]
    
    results = []
    total_start = time.time()
    
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, "PASS" if success else "FAIL"))
        except Exception as e:
            print(f"\n❌ Test failed with error: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, "ERROR"))
    
    total_time = time.time() - total_start
    
    # Print summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    for test_name, status in results:
        icon = "✓" if status == "PASS" else "❌"
        print(f"{icon} {test_name:<40} {status}")
    
    passed = sum(1 for _, status in results if status == "PASS")
    total = len(results)
    
    print(f"\nTotal: {passed}/{total} tests passed")
    print(f"Time: {total_time:.2f}s")
    print("="*70)
    
    return passed == total


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)

