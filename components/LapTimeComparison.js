/**
 * Lap Time Comparison Component
 * 
 * Shows predicted vs actual lap times with Bayesian updates
 * Positioned next to Speed Trap data in the bottom right
 */

import React, { useState, useEffect } from 'styled-components';
import styled from 'styled-components';

const ComparisonContainer = styled.div`
  background: var(--colour-bg);
  border: 1px solid var(--colour-border);
  border-radius: 4px;
  padding: var(--space-3);
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--colour-border);
  margin-bottom: var(--space-3);
`;

const Title = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--colour-fg);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Badge = styled.span`
  background: ${props => props.color || '#e10600'};
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
`;

const DriverRow = styled.div`
  display: grid;
  grid-template-columns: 60px 1fr 1fr 1fr;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--colour-border);
  gap: var(--space-2);
  font-size: 12px;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const DriverName = styled.div`
  color: ${props => props.color ? `#${props.color}` : 'var(--colour-fg)'};
  font-weight: 600;
`;

const TimeValue = styled.div`
  font-family: 'Roboto Mono', monospace;
  font-size: 13px;
  
  &.predicted {
    color: #00bfff;
  }
  
  &.actual {
    color: ${props => props.accurate ? '#00ff88' : '#ffaa00'};
  }
  
  &.error {
    color: ${props => {
      if (Math.abs(props.value) < 0.2) return '#00ff88';
      if (Math.abs(props.value) < 0.5) return '#ffaa00';
      return '#ff4444';
    }};
  }
`;

const ConfidenceBar = styled.div`
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.confidence}%;
    background: linear-gradient(90deg, #00bfff, #00ff88);
    transition: width 0.5s ease;
  }
`;

const ScrollContainer = styled.div`
  overflow-y: auto;
  flex: 1;
  max-height: 300px;
`;

const SummaryStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--colour-border);
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  padding: var(--space-2);
  border-radius: 4px;
  text-align: center;
`;

const StatLabel = styled.div`
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${props => props.color || 'var(--colour-fg)'};
  font-family: 'Roboto Mono', monospace;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  color: #666;
  font-size: 12px;
`;

const ErrorState = styled.div`
  padding: var(--space-3);
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid rgba(255, 68, 68, 0.3);
  border-radius: 4px;
  color: #ff4444;
  font-size: 12px;
`;


export default function LapTimeComparison({ 
  sessionKey, 
  currentLap,
  drivers = [],
  onDriverSelect 
}) {
  const [predictions, setPredictions] = useState({});
  const [actuals, setActuals] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updateInterval, setUpdateInterval] = useState(null);

  // Fetch predictions for all drivers
  const fetchPredictions = async () => {
    if (!sessionKey || !drivers.length) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch predictions for each driver
      const predictionPromises = drivers.slice(0, 10).map(async (driver) => {
        const response = await fetch(
          `/api/ml/lap-time-prediction?sessionKey=${sessionKey}&driverNumber=${driver.number}&lap=${currentLap}`
        );
        
        if (!response.ok) throw new Error('Prediction failed');
        
        const data = await response.json();
        return { driverNumber: driver.number, ...data };
      });
      
      const results = await Promise.all(predictionPromises);
      
      const predictionsMap = {};
      results.forEach(result => {
        predictionsMap[result.driverNumber] = result;
      });
      
      setPredictions(predictionsMap);
    } catch (err) {
      console.error('Failed to fetch predictions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch actual lap times from OpenF1
  const fetchActuals = async () => {
    if (!sessionKey || !currentLap) return;
    
    try {
      const response = await fetch(
        `/api/openf1/lap-times?sessionKey=${sessionKey}&lap=${currentLap}`
      );
      
      if (!response.ok) return;
      
      const data = await response.json();
      setActuals(data);
    } catch (err) {
      console.error('Failed to fetch actual lap times:', err);
    }
  };

  // Update on lap change
  useEffect(() => {
    if (sessionKey && currentLap) {
      fetchPredictions();
      fetchActuals();
    }
  }, [sessionKey, currentLap]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActuals();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [sessionKey, currentLap]);

  const calculateError = (predicted, actual) => {
    if (!predicted || !actual) return null;
    return actual - predicted;
  };

  const calculateAccuracy = (predicted, actual) => {
    if (!predicted || !actual) return false;
    const error = Math.abs(actual - predicted);
    return error < 0.5; // Within 0.5 seconds = accurate
  };

  const getOverallStats = () => {
    const comparisons = drivers
      .map(driver => {
        const pred = predictions[driver.number];
        const actual = actuals[driver.number];
        if (!pred || !actual) return null;
        
        const error = calculateError(pred.predicted_lap_time, actual.lap_time);
        return { error, predicted: pred.predicted_lap_time, actual: actual.lap_time };
      })
      .filter(Boolean);
    
    if (comparisons.length === 0) {
      return { mae: 0, accuracy: 0, samples: 0 };
    }
    
    const mae = comparisons.reduce((sum, c) => sum + Math.abs(c.error), 0) / comparisons.length;
    const accurateCount = comparisons.filter(c => Math.abs(c.error) < 0.5).length;
    const accuracy = (accurateCount / comparisons.length) * 100;
    
    return {
      mae: mae.toFixed(3),
      accuracy: accuracy.toFixed(0),
      samples: comparisons.length
    };
  };

  const stats = getOverallStats();

  if (loading) {
    return (
      <ComparisonContainer>
        <Header>
          <Title>
            Lap Time Predictions
            <Badge color="#00bfff">BAYESIAN</Badge>
          </Title>
        </Header>
        <LoadingState>Loading predictions...</LoadingState>
      </ComparisonContainer>
    );
  }

  if (error) {
    return (
      <ComparisonContainer>
        <Header>
          <Title>
            Lap Time Predictions
            <Badge color="#00bfff">BAYESIAN</Badge>
          </Title>
        </Header>
        <ErrorState>⚠️ {error}</ErrorState>
      </ComparisonContainer>
    );
  }

  return (
    <ComparisonContainer>
      <Header>
        <Title>
          Lap Time Predictions
          <Badge color="#00bfff">BAYESIAN</Badge>
          <Badge color="#666">{currentLap ? `LAP ${currentLap}` : 'N/A'}</Badge>
        </Title>
      </Header>

      <ScrollContainer>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: 'var(--space-2)', padding: '0 var(--space-1)' }}>
          <strong>PREDICTED</strong> vs <strong style={{color: '#00ff88'}}>ACTUAL</strong> (Error)
        </div>
        
        {drivers.slice(0, 10).map(driver => {
          const pred = predictions[driver.number];
          const actual = actuals[driver.number];
          const error = calculateError(pred?.predicted_lap_time, actual?.lap_time);
          const isAccurate = calculateAccuracy(pred?.predicted_lap_time, actual?.lap_time);
          
          return (
            <DriverRow 
              key={driver.number}
              onClick={() => onDriverSelect && onDriverSelect(driver.number)}
              style={{ cursor: onDriverSelect ? 'pointer' : 'default' }}
            >
              <DriverName color={driver.team_colour}>
                {driver.number} {driver.tla}
              </DriverName>
              
              <div>
                <TimeValue className="predicted">
                  {pred ? `${pred.predicted_lap_time?.toFixed(3)}s` : '—'}
                </TimeValue>
                {pred && (
                  <ConfidenceBar confidence={pred.confidence || 70} />
                )}
              </div>
              
              <TimeValue className="actual" accurate={isAccurate}>
                {actual ? `${actual.lap_time?.toFixed(3)}s` : '—'}
              </TimeValue>
              
              <TimeValue className="error" value={error}>
                {error ? (error > 0 ? `+${error.toFixed(3)}` : error.toFixed(3)) : '—'}
              </TimeValue>
            </DriverRow>
          );
        })}
      </ScrollContainer>

      <SummaryStats>
        <StatCard>
          <StatLabel>Avg Error (MAE)</StatLabel>
          <StatValue color={stats.mae < 0.5 ? '#00ff88' : '#ffaa00'}>
            {stats.mae}s
          </StatValue>
        </StatCard>
        
        <StatCard>
          <StatLabel>Accuracy</StatLabel>
          <StatValue color={stats.accuracy > 70 ? '#00ff88' : '#ffaa00'}>
            {stats.accuracy}%
          </StatValue>
        </StatCard>
        
        <StatCard>
          <StatLabel>Samples</StatLabel>
          <StatValue>
            {stats.samples}
          </StatValue>
        </StatCard>
      </SummaryStats>
    </ComparisonContainer>
  );
}

