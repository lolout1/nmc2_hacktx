/**
 * Parallel Monte Carlo Predictions Panel
 * 
 * React component that displays HPC-powered race predictions
 * using the parallel Monte Carlo engine.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Panel = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 20px;
  margin: 10px 0;
  border: 1px solid rgba(225, 6, 0, 0.3);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const Title = styled.h3`
  color: #e10600;
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HPCBadge = styled.span`
  background: linear-gradient(135deg, #e10600 0%, #ff4444 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
`;

const RunButton = styled.button`
  background: ${props => props.disabled ? '#555' : 'linear-gradient(135deg, #e10600 0%, #ff0000 100%)'};
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
  font-size: 14px;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(225, 6, 0, 0.4);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const LoadingBar = styled.div`
  width: 100%;
  height: 4px;
  background: rgba(225, 6, 0, 0.2);
  border-radius: 2px;
  overflow: hidden;
  margin: 15px 0;
  
  &::after {
    content: '';
    display: block;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg, transparent, #e10600, transparent);
    animation: loading 1s infinite;
  }
  
  @keyframes loading {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }
`;

const ResultGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 15px;
`;

const ResultCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ResultLabel = styled.div`
  color: #888;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const ResultValue = styled.div`
  color: white;
  font-size: 20px;
  font-weight: 700;
  
  &.positive {
    color: #00ff88;
  }
  
  &.negative {
    color: #ff4444;
  }
`;

const ActionBanner = styled.div`
  background: ${props => {
    if (props.action?.includes('PIT_NOW')) return 'rgba(255, 68, 68, 0.2)';
    if (props.action?.includes('PUSH')) return 'rgba(0, 255, 136, 0.2)';
    return 'rgba(255, 204, 0, 0.2)';
  }};
  border-left: 4px solid ${props => {
    if (props.action?.includes('PIT_NOW')) return '#ff4444';
    if (props.action?.includes('PUSH')) return '#00ff88';
    return '#ffcc00';
  }};
  padding: 15px;
  border-radius: 6px;
  margin-top: 15px;
`;

const ActionText = styled.div`
  color: white;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
`;

const ActionConfidence = styled.div`
  color: #aaa;
  font-size: 12px;
`;

const PerformanceFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: #666;
  font-size: 11px;
`;

const PerformanceMetric = styled.span`
  color: #00ff88;
  font-weight: 600;
`;

const DistributionChart = styled.div`
  margin-top: 15px;
`;

const DistributionBar = styled.div`
  display: flex;
  align-items: center;
  margin: 6px 0;
  gap: 10px;
`;

const PositionLabel = styled.span`
  color: #aaa;
  font-size: 12px;
  min-width: 30px;
`;

const BarContainer = styled.div`
  flex: 1;
  height: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
`;

const BarFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #e10600 0%, #ff4444 100%);
  width: ${props => props.width}%;
  transition: width 0.5s ease;
`;

const BarLabel = styled.span`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: white;
  font-size: 11px;
  font-weight: 600;
`;

const ErrorMessage = styled.div`
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid rgba(255, 68, 68, 0.3);
  border-radius: 6px;
  padding: 12px;
  color: #ff4444;
  font-size: 13px;
  margin-top: 15px;
`;


export default function ParallelMCPanel({ sessionKey, driverNumber, driverName }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [simCount, setSimCount] = useState(100000);

  const runPrediction = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/ml/parallel-predictions?sessionKey=${sessionKey}&driverNumber=${driverNumber}&simulations=${simCount}`
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setPrediction(data);
    } catch (err) {
      console.error('Prediction error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Parse position distribution for chart
  const getTopPositions = () => {
    if (!prediction?.position_distribution) return [];
    
    const positions = Object.entries(prediction.position_distribution)
      .map(([pos, prob]) => ({
        position: pos,
        probability: parseFloat(prob)
      }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5);
    
    return positions;
  };

  const formatAction = (action) => {
    return action.replace(/_/g, ' ');
  };

  const getPositionChange = () => {
    if (!prediction?.prediction) return null;
    const change = prediction.prediction.position_change;
    if (change > 0) return `+${change}`;
    return change;
  };

  const getPositionClass = () => {
    if (!prediction?.prediction) return '';
    const change = prediction.prediction.position_change;
    if (change > 0) return 'positive';
    if (change < 0) return 'negative';
    return '';
  };

  return (
    <Panel>
      <Header>
        <Title>
          HPC Predictions
          <HPCBadge>PARALLEL MC</HPCBadge>
        </Title>
        <RunButton 
          onClick={runPrediction} 
          disabled={loading || !sessionKey || !driverNumber}
        >
          {loading ? 'Computing...' : `Run ${(simCount/1000).toFixed(0)}K Sims`}
        </RunButton>
      </Header>

      {driverName && (
        <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '10px' }}>
          Driver #{driverNumber} - {driverName}
        </div>
      )}

      {loading && <LoadingBar />}

      {error && (
        <ErrorMessage>
          ⚠️ {error}
        </ErrorMessage>
      )}

      {prediction && !loading && (
        <>
          <ResultGrid>
            <ResultCard>
              <ResultLabel>Predicted Position</ResultLabel>
              <ResultValue>P{prediction.prediction.predicted_position}</ResultValue>
            </ResultCard>
            
            <ResultCard>
              <ResultLabel>Position Change</ResultLabel>
              <ResultValue className={getPositionClass()}>
                {getPositionChange()}
              </ResultValue>
            </ResultCard>
            
            <ResultCard>
              <ResultLabel>Confidence</ResultLabel>
              <ResultValue>{prediction.prediction.confidence}</ResultValue>
            </ResultCard>
            
            <ResultCard>
              <ResultLabel>Expected Lap Time</ResultLabel>
              <ResultValue style={{ fontSize: '16px' }}>
                {prediction.prediction.expected_lap_time}
              </ResultValue>
            </ResultCard>
          </ResultGrid>

          {prediction.recommendation && (
            <ActionBanner action={prediction.recommendation.action}>
              <ActionText>
                🎯 {formatAction(prediction.recommendation.action)}
              </ActionText>
              <ActionConfidence>
                Confidence: {prediction.recommendation.confidence}
              </ActionConfidence>
            </ActionBanner>
          )}

          <DistributionChart>
            <ResultLabel style={{ marginBottom: '10px' }}>
              Position Probability Distribution
            </ResultLabel>
            {getTopPositions().map(({ position, probability }) => (
              <DistributionBar key={position}>
                <PositionLabel>{position}</PositionLabel>
                <BarContainer>
                  <BarFill width={probability} />
                  <BarLabel>{probability.toFixed(1)}%</BarLabel>
                </BarContainer>
              </DistributionBar>
            ))}
          </DistributionChart>

          {prediction.performance && (
            <PerformanceFooter>
              <div>
                <PerformanceMetric>{prediction.performance.simulations.toLocaleString()}</PerformanceMetric> simulations
              </div>
              <div>
                <PerformanceMetric>{prediction.performance.computation_time_ms}ms</PerformanceMetric>
              </div>
              <div>
                <PerformanceMetric>{prediction.performance.cpu_cores}</PerformanceMetric> cores
              </div>
              <div>
                <PerformanceMetric>{prediction.performance.throughput}</PerformanceMetric>
              </div>
            </PerformanceFooter>
          )}
        </>
      )}
    </Panel>
  );
}

