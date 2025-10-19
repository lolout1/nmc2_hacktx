/**
 * ML Predictions Sidebar
 * Displays Monte Carlo simulation predictions and race analytics
 */
import styled from "styled-components";
import { useState, useEffect } from "react";
import DraggableSidebar from "./DraggableSidebar";

const PredictionsContent = styled.div`
  padding: var(--space-3);
  min-width: 320px;
  max-width: 400px;
  max-height: 600px;
  overflow-y: auto;
  font-size: 13px;
`;

const PredictionSection = styled.div`
  margin-bottom: var(--space-4);
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h4`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: var(--space-2);
`;

const PredictionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2);
  background: var(--colour-offset);
  border-radius: 4px;
  margin-bottom: var(--space-2);
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const DriverLabel = styled.span`
  font-weight: 600;
  color: ${props => props.$color || 'var(--colour-fg)'};
`;

const PredictionValue = styled.span`
  font-family: 'Courier New', monospace;
  color: ${props => {
    if (props.$trend === 'up') return 'limegreen';
    if (props.$trend === 'down') return 'red';
    return 'rgba(255, 255, 255, 0.8)';
  }};
`;

const Confidence = styled.div`
  margin-top: var(--space-2);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  
  span {
    color: ${props => {
      const conf = parseFloat(props.$confidence);
      if (conf >= 80) return 'limegreen';
      if (conf >= 60) return 'yellow';
      return 'orange';
    }};
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-4);
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
`;

const StatusBadge = styled.span`
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  background: ${props => {
    if (props.$status === 'computing') return 'rgba(0, 180, 255, 0.2)';
    if (props.$status === 'ready') return 'rgba(0, 255, 0, 0.2)';
    return 'rgba(255, 165, 0, 0.2)';
  }};
  color: ${props => {
    if (props.$status === 'computing') return 'rgba(0, 180, 255, 1)';
    if (props.$status === 'ready') return 'limegreen';
    return 'orange';
  }};
`;

/**
 * MLPredictions Component
 * @param {Object} sessionData - Current session data
 * @param {Object} driverList - Driver information
 * @param {Array} timingData - Timing data for predictions
 */
const MLPredictions = ({ sessionData, driverList = {}, timingData = {}, voiceService }) => {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch predictions from backend
  const fetchPredictions = async () => {
    if (!sessionData?.session_key) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ml/predict?sessionKey=${sessionData.session_key}`);
      
      if (!response.ok) {
        throw new Error(`Prediction API error: ${response.status}`);
      }
      
      const data = await response.json();
      setPredictions(data.predictions);
      setLastUpdate(new Date().toISOString());

      // Voice announcement for top prediction
      if (voiceService && voiceService.isEnabled && data.predictions?.raceWinner?.[0]) {
        const topPrediction = data.predictions.raceWinner[0];
        const odds = Math.round((1 / topPrediction.probability) * 100) / 100;
        voiceService.announceRacePrediction({
          driver: topPrediction.driver,
          probability: topPrediction.probability,
          odds: odds
        });
      }
    } catch (err) {
      console.error('[ML] Prediction error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh predictions every 30 seconds
  useEffect(() => {
    fetchPredictions();
    
    const interval = setInterval(() => {
      fetchPredictions();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [sessionData]);

  const getDriverName = (driverNumber) => {
    const driver = driverList[driverNumber];
    return driver?.Tla || driver?.BroadcastName || `#${driverNumber}`;
  };

  const getDriverColor = (driverNumber) => {
    const driver = driverList[driverNumber];
    return driver?.TeamColour ? `#${driver.TeamColour}` : 'var(--colour-fg)';
  };

  const renderContent = () => {
    if (loading && !predictions) {
      return (
        <LoadingSpinner>
          🔮 Computing predictions...
        </LoadingSpinner>
      );
    }

    if (error) {
      return (
        <PredictionsContent>
          <PredictionSection>
            <SectionTitle>⚠️ Error</SectionTitle>
            <div style={{ color: 'red', fontSize: '12px' }}>{error}</div>
          </PredictionSection>
        </PredictionsContent>
      );
    }

    if (!predictions) {
      return (
        <PredictionsContent>
          <PredictionSection>
            <SectionTitle>Status</SectionTitle>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Waiting for session data...
            </div>
          </PredictionSection>
        </PredictionsContent>
      );
    }

    return (
      <PredictionsContent>
        {/* Status */}
        <PredictionSection>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SectionTitle>Monte Carlo Analysis</SectionTitle>
            <StatusBadge $status={predictions.status || 'ready'}>
              {predictions.status === 'computing' ? 'COMPUTING' : 'READY'}
            </StatusBadge>
          </div>
        </PredictionSection>

        {/* Lap Time Predictions */}
        {predictions.lapTimes && predictions.lapTimes.length > 0 && (
          <PredictionSection>
            <SectionTitle>⏱️ Predicted Lap Times</SectionTitle>
            {predictions.lapTimes.slice(0, 5).map((pred, idx) => (
              <PredictionItem key={idx}>
                <DriverLabel $color={getDriverColor(pred.driver)}>
                  {getDriverName(pred.driver)}
                </DriverLabel>
                <PredictionValue>
                  {pred.predicted_time}
                </PredictionValue>
              </PredictionItem>
            ))}
            {predictions.confidence && (
              <Confidence $confidence={predictions.confidence}>
                Confidence: <span>{predictions.confidence}%</span>
              </Confidence>
            )}
          </PredictionSection>
        )}

        {/* Position Predictions */}
        {predictions.positions && predictions.positions.length > 0 && (
          <PredictionSection>
            <SectionTitle>🏁 Predicted Final Positions</SectionTitle>
            {predictions.positions.slice(0, 5).map((pred, idx) => (
              <PredictionItem key={idx}>
                <div>
                  <DriverLabel $color={getDriverColor(pred.driver)}>
                    P{pred.position} {getDriverName(pred.driver)}
                  </DriverLabel>
                </div>
                <PredictionValue $trend={pred.trend}>
                  {pred.trend === 'up' && '↑'}
                  {pred.trend === 'down' && '↓'}
                  {pred.probability}%
                </PredictionValue>
              </PredictionItem>
            ))}
          </PredictionSection>
        )}

        {/* Pit Stop Predictions */}
        {predictions.pitStops && predictions.pitStops.length > 0 && (
          <PredictionSection>
            <SectionTitle>🔧 Predicted Pit Windows</SectionTitle>
            {predictions.pitStops.slice(0, 3).map((pred, idx) => (
              <PredictionItem key={idx}>
                <DriverLabel $color={getDriverColor(pred.driver)}>
                  {getDriverName(pred.driver)}
                </DriverLabel>
                <PredictionValue>
                  Lap {pred.predicted_lap}
                </PredictionValue>
              </PredictionItem>
            ))}
          </PredictionSection>
        )}

        {/* Simulation Info */}
        {predictions.simulations && (
          <PredictionSection>
            <SectionTitle>📊 Simulation Stats</SectionTitle>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.6' }}>
              <div>Simulations: {predictions.simulations.toLocaleString()}</div>
              <div>Algorithm: Monte Carlo</div>
              {lastUpdate && (
                <div>Updated: {new Date(lastUpdate).toLocaleTimeString()}</div>
              )}
            </div>
          </PredictionSection>
        )}
      </PredictionsContent>
    );
  };

  return (
    <DraggableSidebar
      title="🔮 ML Predictions"
      defaultPosition={{ x: window.innerWidth - 420, y: 20 }}
      zIndex={98}
      storageKey="ml-predictions-position"
      icon="🤖"
    >
      {renderContent()}
    </DraggableSidebar>
  );
};

export default MLPredictions;

