/**
 * Lap Time Predictions Panel
 * Container for Bayesian lap time predictions
 * Designed to sit next to Speed Trap data
 */

import styled from "styled-components";
import { useState, useEffect } from "react";
import LapTimePredictionRow from "./LapTimePredictionRow";

const PanelContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--colour-border);
`;

const PanelHeader = styled.div`
  padding: var(--space-2) var(--space-3);
  background-color: var(--colour-offset);
  border-bottom: 1px solid var(--colour-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PanelTitle = styled.p`
  margin: 0;
  font-weight: 700;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Badge = styled.span`
  background: ${props => props.$color || 'rgba(0, 191, 255, 0.3)'};
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

const ColumnHeaders = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr 1fr 100px;
  padding: var(--space-2) var(--space-2) var(--space-1) var(--space-2);
  background-color: var(--colour-offset);
  gap: var(--space-2);
`;

const ColumnHeader = styled.p`
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ContentArea = styled.div`
  flex-grow: 1;
  overflow-y: auto;
  max-height: 300px;
  min-height: 200px;
`;

const SummaryStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  padding: var(--space-2);
  background-color: var(--colour-offset);
  border-top: 1px solid var(--colour-border);
`;

const StatItem = styled.div`
  text-align: center;
  padding: var(--space-1);
`;

const StatLabel = styled.div`
  font-size: 9px;
  color: #888;
  text-transform: uppercase;
  margin-bottom: 2px;
`;

const StatValue = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${props => props.$color || 'var(--colour-fg)'};
  font-family: 'Roboto Mono', monospace;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  color: #666;
  font-size: 12px;
  gap: var(--space-2);
`;

const RefreshButton = styled.button`
  background: rgba(0, 191, 255, 0.2);
  border: 1px solid rgba(0, 191, 255, 0.5);
  color: #00bfff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 191, 255, 0.3);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

export default function LapTimePredictionsPanel({
  sessionKey,
  currentLap,
  drivers = [],
  actualLapTimes = {},
  showStats = true
}) {
  const [predictions, setPredictions] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePredictionUpdate = (driverNumber, prediction) => {
    setPredictions(prev => ({
      ...prev,
      [driverNumber]: prediction
    }));
  };

  const calculateStats = () => {
    const validPredictions = Object.entries(predictions)
      .filter(([driverNum, pred]) => pred && actualLapTimes[driverNum])
      .map(([driverNum, pred]) => {
        const actual = actualLapTimes[driverNum];
        const predicted = pred.predicted_lap_time;
        const error = Math.abs(actual - predicted);
        return { error, predicted, actual };
      });

    if (validPredictions.length === 0) {
      return { mae: 0, accuracy: 0, samples: 0 };
    }

    const mae = validPredictions.reduce((sum, p) => sum + p.error, 0) / validPredictions.length;
    const accurateCount = validPredictions.filter(p => p.error < 0.5).length;
    const accuracy = (accurateCount / validPredictions.length) * 100;

    return {
      mae: mae.toFixed(3),
      accuracy: accuracy.toFixed(0),
      samples: validPredictions.length
    };
  };

  const stats = calculateStats();

  if (!sessionKey) {
    return (
      <PanelContainer>
        <PanelHeader>
          <PanelTitle>
            LAP TIME PREDICTIONS
            <Badge $color="rgba(0, 191, 255, 0.4)">BAYESIAN</Badge>
          </PanelTitle>
        </PanelHeader>
        <EmptyState>
          <div>⚠️ No session selected</div>
          <div style={{ fontSize: '11px', color: '#888' }}>
            Load a session to see predictions
          </div>
        </EmptyState>
      </PanelContainer>
    );
  }

  if (drivers.length === 0) {
    return (
      <PanelContainer>
        <PanelHeader>
          <PanelTitle>
            LAP TIME PREDICTIONS
            <Badge $color="rgba(0, 191, 255, 0.4)">BAYESIAN</Badge>
          </PanelTitle>
        </PanelHeader>
        <EmptyState>
          <div>⏳ Loading drivers...</div>
        </EmptyState>
      </PanelContainer>
    );
  }

  return (
    <PanelContainer>
      <PanelHeader>
        <PanelTitle>
          LAP TIME PREDICTIONS
          <Badge $color="rgba(0, 191, 255, 0.4)">BAYESIAN</Badge>
          {currentLap && <Badge $color="rgba(255, 255, 255, 0.2)">LAP {currentLap}</Badge>}
        </PanelTitle>
        <RefreshButton onClick={() => setRefreshKey(k => k + 1)}>
          ↻ Refresh
        </RefreshButton>
      </PanelHeader>

      <ColumnHeaders>
        <ColumnHeader>DRIVER</ColumnHeader>
        <ColumnHeader>PREDICTED</ColumnHeader>
        <ColumnHeader>ACTUAL</ColumnHeader>
        <ColumnHeader>CONFIDENCE</ColumnHeader>
      </ColumnHeaders>

      <ContentArea>
        {drivers.slice(0, 20).map((driver) => (
          <LapTimePredictionRow
            key={`${driver.driver_number || driver.number}-${refreshKey}`}
            driverNumber={driver.driver_number || driver.number}
            driverTla={driver.name_acronym || driver.tla || driver.Tla}
            teamColor={driver.team_colour || driver.TeamColour}
            sessionKey={sessionKey}
            currentLap={currentLap}
            actualLapTime={actualLapTimes[driver.driver_number || driver.number]}
            onPredictionUpdate={handlePredictionUpdate}
          />
        ))}
      </ContentArea>

      {showStats && (
        <SummaryStats>
          <StatItem>
            <StatLabel>Avg Error</StatLabel>
            <StatValue $color={parseFloat(stats.mae) < 0.5 ? '#00ff88' : '#ffaa00'}>
              {stats.mae}s
            </StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Accuracy</StatLabel>
            <StatValue $color={parseFloat(stats.accuracy) > 70 ? '#00ff88' : '#ffaa00'}>
              {stats.accuracy}%
            </StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Drivers</StatLabel>
            <StatValue>
              {stats.samples}/{drivers.length}
            </StatValue>
          </StatItem>
        </SummaryStats>
      )}
    </PanelContainer>
  );
}

