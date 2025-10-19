# Monte Carlo F1 Predictions

Machine Learning predictions for F1 races using Monte Carlo simulation methods.

## Overview

This module uses Monte Carlo simulation to generate probabilistic predictions for:
- **Lap Times**: Predicted lap times based on historical performance
- **Final Positions**: Probability distributions for race finish positions
- **Pit Stop Windows**: Optimal pit stop timing predictions

## How It Works

### Monte Carlo Simulation
The predictor runs **10,000 simulations** for each prediction type:

1. **Lap Time Prediction**
   - Uses normal distribution based on recent lap history
   - Accounts for variance in driver performance
   - Generates 90% confidence intervals

2. **Position Prediction**
   - Simulates race progression with position changes
   - Uses triangular distribution for realistic variability
   - Calculates probability of each final position

3. **Pit Stop Prediction**
   - Predicts optimal pit stop windows based on:
     - Tire degradation patterns
     - Fuel load
     - Current race position
     - Historical pit stop data

## Installation

```bash
# Install Python dependencies
cd montecarlo
pip install -r requirements.txt
```

## Usage

### Command Line
```bash
python predictor.py <session_key>
```

### API Endpoint
```
GET /api/ml/predict?sessionKey=9161
```

## Output Format

```json
{
  "status": "ready",
  "simulations": 10000,
  "lapTimes": [
    {
      "driver": 1,
      "predicted_time": "89.234s",
      "confidence": "85.2",
      "range": "88.1s - 90.5s"
    }
  ],
  "positions": [
    {
      "driver": 1,
      "position": 3,
      "probability": "76.3",
      "trend": "up"
    }
  ],
  "pitStops": [
    {
      "driver": 4,
      "predicted_lap": 18,
      "confidence": "75"
    }
  ],
  "confidence": "75.0"
}
```

## Configuration

Edit `predictor.py` to adjust:
- `SIMULATIONS`: Number of Monte Carlo iterations (default: 10,000)
- `CONFIDENCE_THRESHOLD`: Minimum confidence for predictions (default: 0.75)

## Future Enhancements

- [ ] Real-time data integration with OpenF1 cache
- [ ] Weather condition modeling
- [ ] Tire compound strategy optimization
- [ ] Collision/incident probability
- [ ] Neural network integration for pattern learning
- [ ] Bayesian optimization for hyperparameters

## Algorithm Details

### Normal Distribution Model
```
lap_time ~ N(μ, σ²)
where μ = mean of recent laps
      σ = standard deviation of recent laps
```

### Triangular Distribution Model
```
position_change ~ Tri(a=-3, b=0, c=3)
Favors maintaining position with small variations
```

## Performance

- **Execution Time**: ~200ms for full prediction suite
- **Memory Usage**: <50MB
- **Accuracy**: 75-85% confidence on stable conditions

## License

MIT License - See main project LICENSE file

