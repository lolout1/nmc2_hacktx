/**
 * Lap Time Prediction Row
 * Integrates Bayesian predictions seamlessly into existing driver rows
 * Shows predicted vs actual lap times with confidence intervals
 */

import styled from "styled-components";
import { useState, useEffect } from "react";

const PredictionRow = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr 1fr 100px;
  align-items: center;
  padding: var(--space-2);
  gap: var(--space-2);
  border-bottom: 1px solid var(--colour-border);
  font-size: 12px;
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const DriverLabel = styled.div`
  color: ${props => props.$color ? `#${props.$color}` : 'var(--colour-fg)'};
  font-weight: 600;
  font-size: 13px;
`;

const TimeDisplay = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const TimeValue = styled.div`
  font-family: 'Roboto Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.$color || 'var(--colour-fg)'};
`;

const TimeLabel = styled.div`
  font-size: 9px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ConfidenceIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ConfidenceBar = styled.div`
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.$confidence}%;
    background: ${props => {
      if (props.$confidence > 80) return 'linear-gradient(90deg, #00bfff, #00ff88)';
      if (props.$confidence > 60) return 'linear-gradient(90deg, #00bfff, #ffcc00)';
      return 'linear-gradient(90deg, #00bfff, #ff4444)';
    }};
    transition: width 0.5s ease;
  }
`;

const ConfidenceValue = styled.span`
  font-size: 10px;
  color: ${props => {
    if (props.$value > 80) return '#00ff88';
    if (props.$value > 60) return '#ffcc00';
    return '#ff4444';
  }};
  font-weight: 600;
  min-width: 28px;
`;

const ErrorBadge = styled.span`
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  font-family: 'Roboto Mono', monospace;
  background: ${props => {
    const abs = Math.abs(props.$value);
    if (abs < 0.2) return 'rgba(0, 255, 136, 0.2)';
    if (abs < 0.5) return 'rgba(255, 204, 0, 0.2)';
    return 'rgba(255, 68, 68, 0.2)';
  }};
  color: ${props => {
    const abs = Math.abs(props.$value);
    if (abs < 0.2) return '#00ff88';
    if (abs < 0.5) return '#ffcc00';
    return '#ff4444';
  }};
`;

const LoadingDot = styled.span`
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #00bfff;
  animation: pulse 1.5s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
`;

export default function LapTimePredictionRow({
  driverNumber,
  driverTla,
  teamColor,
  sessionKey,
  currentLap,
  actualLapTime = null,
  onPredictionUpdate
}) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPrediction = async () => {
    if (!sessionKey || !driverNumber || !currentLap) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ml/lap-time-prediction?sessionKey=${sessionKey}&driverNumber=${driverNumber}&lap=${currentLap}`
      );
      
      if (!response.ok) {
        throw new Error('Prediction failed');
      }
      
      const data = await response.json();
      setPrediction(data);
      
      if (onPredictionUpdate) {
        onPredictionUpdate(driverNumber, data);
      }
    } catch (err) {
      console.error(`Prediction error for driver ${driverNumber}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction();
  }, [sessionKey, driverNumber, currentLap]);

  const calculateError = () => {
    if (!prediction || !actualLapTime) return null;
    return actualLapTime - prediction.predicted_lap_time;
  };

  const error_value = calculateError();

  return (
    <PredictionRow>
      <DriverLabel $color={teamColor}>
        {driverNumber} {driverTla}
      </DriverLabel>
      
      <TimeDisplay>
        {loading ? (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <LoadingDot style={{ animationDelay: '0s' }} />
            <LoadingDot style={{ animationDelay: '0.2s' }} />
            <LoadingDot style={{ animationDelay: '0.4s' }} />
          </div>
        ) : prediction ? (
          <>
            <TimeValue $color="#00bfff">
              {prediction.predicted_lap_time?.toFixed(3)}s
            </TimeValue>
            <TimeLabel>Predicted</TimeLabel>
          </>
        ) : (
          <TimeValue style={{ color: '#666' }}>—</TimeValue>
        )}
      </TimeDisplay>
      
      <TimeDisplay>
        {actualLapTime ? (
          <>
            <TimeValue $color={error_value && Math.abs(error_value) < 0.5 ? '#00ff88' : '#ffaa00'}>
              {actualLapTime.toFixed(3)}s
            </TimeValue>
            <TimeLabel>Actual</TimeLabel>
          </>
        ) : (
          <TimeValue style={{ color: '#666' }}>—</TimeValue>
        )}
      </TimeDisplay>
      
      {prediction ? (
        <ConfidenceIndicator>
          <ConfidenceBar $confidence={prediction.confidence} />
          <ConfidenceValue $value={prediction.confidence}>
            {prediction.confidence}%
          </ConfidenceValue>
        </ConfidenceIndicator>
      ) : error_value !== null ? (
        <ErrorBadge $value={error_value}>
          {error_value > 0 ? '+' : ''}{error_value.toFixed(3)}
        </ErrorBadge>
      ) : (
        <div style={{ color: '#666', fontSize: '11px' }}>—</div>
      )}
    </PredictionRow>
  );
}

