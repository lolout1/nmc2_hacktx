/**
 * Enhanced Strategy Command Center
 * Integrates HPC Monte Carlo, Explainable AI, and Bayesian Updates
 * into a unified, seamless decision-making interface
 */
import styled from "styled-components";
import { useState, useEffect } from "react";
import DraggableSidebar from "./DraggableSidebar";

const StrategyContent = styled.div`
  padding: var(--space-3);
  min-width: 360px;
  max-width: 420px;
  max-height: 85vh;
  overflow-y: auto;
  font-size: 13px;
`;

const DriverHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  background: linear-gradient(135deg, 
    ${props => props.$teamColor ? `#${props.$teamColor}20` : 'rgba(255,255,255,0.05)'} 0%, 
    transparent 100%
  );
  border-left: 4px solid ${props => props.$teamColor ? `#${props.$teamColor}` : 'grey'};
  border-radius: 4px;
  margin-bottom: var(--space-3);
`;

const DriverInfo = styled.div`
  flex: 1;
`;

const DriverName = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: var(--colour-fg);
  margin-bottom: 4px;
`;

const DriverTeam = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
`;

const StatusBadge = styled.div`
  display: flex;
  gap: 4px;
  flex-direction: column;
  align-items: flex-end;
`;

const Badge = styled.span`
  background: ${props => props.$color || 'rgba(0, 180, 255, 0.3)'};
  color: white;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

const CurrentPosition = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${props => {
    if (props.$pos === 1) return 'gold';
    if (props.$pos === 2) return 'silver';
    if (props.$pos === 3) return '#CD7F32';
    return 'rgba(255, 255, 255, 0.8)';
  }};
`;

const DecisionCard = styled.div`
  background: linear-gradient(135deg, rgba(0, 180, 255, 0.15) 0%, rgba(0, 180, 255, 0.05) 100%);
  border: 2px solid rgba(0, 180, 255, 0.5);
  border-radius: 8px;
  padding: var(--space-3);
  margin-bottom: var(--space-3);
  position: relative;
  overflow: hidden;
`;

const ActionLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(0, 180, 255, 1);
  margin-bottom: var(--space-2);
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ActionText = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: var(--colour-fg);
  margin-bottom: var(--space-2);
  text-transform: uppercase;
`;

const ConfidenceMeter = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: var(--space-2);
`;

const ConfidenceBar = styled.div`
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.$confidence}%;
    background: linear-gradient(90deg, #00bfff, #00ff88);
    transition: width 0.5s ease;
  }
`;

const ConfidenceValue = styled.span`
  color: #00ff88;
  font-weight: 700;
  font-size: 14px;
  min-width: 40px;
`;

// Explainable AI Section
const ExplanationSection = styled.div`
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const SectionTitle = styled.h4`
  color: ${props => props.$color || '#00bfff'};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: var(--space-2) 0;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const FactorItem = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border-left: 3px solid ${props => props.$color || '#00bfff'};
  border-radius: 4px;
  padding: var(--space-2);
  margin: var(--space-2) 0;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(2px);
  }
`;

const FactorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const FactorName = styled.span`
  color: white;
  font-weight: 600;
  font-size: 12px;
`;

const ImpactBadge = styled.span`
  background: ${props => {
    const abs = Math.abs(props.$value);
    if (abs > 50) return props.$value > 0 ? '#00ff88' : '#ff4444';
    return '#ffcc00';
  }};
  color: #000;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
`;

const FactorDescription = styled.p`
  color: #aaa;
  font-size: 11px;
  margin: 0;
  line-height: 1.4;
`;

// Bayesian Prediction Section
const PredictionCard = styled.div`
  background: rgba(0, 191, 255, 0.08);
  border-radius: 6px;
  padding: var(--space-2);
  margin: var(--space-2) 0;
`;

const PredictionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  margin-top: var(--space-2);
`;

const PredictionStat = styled.div`
  text-align: center;
`;

const StatLabel = styled.div`
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${props => props.$color || 'white'};
  font-family: 'Roboto Mono', monospace;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  color: #666;
  font-size: 12px;
  gap: var(--space-2);
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 191, 255, 0.2);
  border-top-color: #00bfff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ErrorState = styled.div`
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid rgba(255, 68, 68, 0.3);
  border-radius: 6px;
  padding: var(--space-2);
  color: #ff4444;
  font-size: 12px;
  margin: var(--space-2) 0;
`;

const PerformanceFooter = styled.div`
  display: flex;
  justify-content: space-between;
  padding: var(--space-2);
  margin-top: var(--space-3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 10px;
  color: #666;
`;

const PerformanceMetric = styled.span`
  color: #00ff88;
  font-weight: 600;
`;

export default function EnhancedStrategyCenter({
  sessionKey,
  focusedDriver,
  driverData,
  currentLap,
  onClose,
}) {
  const [strategy, setStrategy] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [lapPrediction, setLapPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch strategy with explainable AI
  const fetchStrategy = async () => {
    if (!sessionKey || !focusedDriver) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Get Monte Carlo strategy prediction
      const strategyRes = await fetch(
        `/api/ml/parallel-predictions?sessionKey=${sessionKey}&driverNumber=${focusedDriver}&simulations=100000`
      );
      
      if (!strategyRes.ok) throw new Error('Strategy fetch failed');
      const strategyData = await strategyRes.json();
      setStrategy(strategyData);

      // 2. Get explainable AI factors
      const explainRes = await fetch('/api/ml/explain-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: strategyData.recommendation?.action || 'MAINTAIN_PACE',
          driver_state: {
            driver_number: focusedDriver,
            position: strategyData.prediction?.current_position || 10,
            tire_age: 15,
            tire_compound: 'MEDIUM',
            fuel_load: 60,
            recent_lap_times: [89.5, 89.8, 90.1],
            pit_stops_made: 1
          },
          simulation_results: {
            predicted_position: strategyData.prediction?.predicted_position
          }
        })
      });

      if (explainRes.ok) {
        const explainData = await explainRes.json();
        setExplanation(explainData);
      }

      // 3. Get Bayesian lap time prediction
      if (currentLap) {
        const lapRes = await fetch(
          `/api/ml/lap-time-prediction?sessionKey=${sessionKey}&driverNumber=${focusedDriver}&lap=${currentLap}`
        );
        
        if (lapRes.ok) {
          const lapData = await lapRes.json();
          setLapPrediction(lapData);
        }
      }

    } catch (err) {
      console.error('Strategy fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionKey && focusedDriver) {
      fetchStrategy();
    }
  }, [sessionKey, focusedDriver, currentLap]);

  const driverName = driverData?.full_name || `Driver #${focusedDriver}`;
  const teamName = driverData?.team_name || 'Unknown Team';
  const teamColor = driverData?.team_colour;

  return (
    <DraggableSidebar
      title="Strategy Command Center"
      subtitle="HPC-Powered Race Strategy"
      onClose={onClose}
      defaultPosition={{ x: 20, y: 100 }}
    >
      <StrategyContent>
        {/* Driver Header */}
        <DriverHeader $teamColor={teamColor}>
          <DriverInfo>
            <DriverName>{driverName}</DriverName>
            <DriverTeam>{teamName}</DriverTeam>
          </DriverInfo>
          <StatusBadge>
            <Badge $color="rgba(0, 191, 255, 0.5)">HPC</Badge>
            <Badge $color="rgba(0, 255, 136, 0.5)">XAI</Badge>
            {strategy && (
              <CurrentPosition $pos={strategy.prediction?.current_position}>
                P{strategy.prediction?.current_position}
              </CurrentPosition>
            )}
          </StatusBadge>
        </DriverHeader>

        {loading && (
          <LoadingState>
            <LoadingSpinner />
            <div>Running 100K simulations...</div>
          </LoadingState>
        )}

        {error && <ErrorState>⚠️ {error}</ErrorState>}

        {strategy && !loading && (
          <>
            {/* Main Decision */}
            <DecisionCard>
              <ActionLabel>
                🎯 RECOMMENDED ACTION
                <Badge $color="rgba(0, 180, 255, 0.4)">
                  {strategy.performance?.simulations.toLocaleString()} sims
                </Badge>
              </ActionLabel>
              <ActionText>
                {strategy.recommendation?.action.replace(/_/g, ' ')}
              </ActionText>
              <ConfidenceMeter>
                <ConfidenceBar $confidence={parseFloat(strategy.recommendation?.confidence)} />
                <ConfidenceValue>{strategy.recommendation?.confidence}</ConfidenceValue>
              </ConfidenceMeter>
            </DecisionCard>

            {/* Bayesian Lap Time Prediction */}
            {lapPrediction && (
              <PredictionCard>
                <SectionTitle $color="#00bfff">
                  ⏱️ NEXT LAP PREDICTION (Bayesian)
                </SectionTitle>
                <PredictionGrid>
                  <PredictionStat>
                    <StatLabel>Predicted Time</StatLabel>
                    <StatValue $color="#00bfff">
                      {lapPrediction.predicted_lap_time?.toFixed(3)}s
                    </StatValue>
                  </PredictionStat>
                  <PredictionStat>
                    <StatLabel>Confidence</StatLabel>
                    <StatValue $color="#00ff88">
                      {lapPrediction.confidence}%
                    </StatValue>
                  </PredictionStat>
                  <PredictionStat>
                    <StatLabel>Lower Bound</StatLabel>
                    <StatValue style={{ fontSize: '13px' }}>
                      {lapPrediction.confidence_interval?.lower?.toFixed(3)}s
                    </StatValue>
                  </PredictionStat>
                  <PredictionStat>
                    <StatLabel>Upper Bound</StatLabel>
                    <StatValue style={{ fontSize: '13px' }}>
                      {lapPrediction.confidence_interval?.upper?.toFixed(3)}s
                    </StatValue>
                  </PredictionStat>
                </PredictionGrid>
              </PredictionCard>
            )}

            {/* Explainable AI - Why this decision? */}
            {explanation && (
              <ExplanationSection>
                <SectionTitle $color="#00ff88">
                  💡 WHY THIS DECISION?
                </SectionTitle>
                
                {/* Primary Factors */}
                {explanation.primary_factors?.slice(0, 3).map((factor, idx) => (
                  <FactorItem key={idx} $color="#00ff88">
                    <FactorHeader>
                      <FactorName>{factor.factor_name}</FactorName>
                      <ImpactBadge $value={factor.impact_score}>
                        {factor.impact_score > 0 ? '+' : ''}{factor.impact_score.toFixed(0)}
                      </ImpactBadge>
                    </FactorHeader>
                    <FactorDescription>{factor.description}</FactorDescription>
                  </FactorItem>
                ))}

                {/* Risk Factors */}
                {explanation.risk_factors?.length > 0 && (
                  <>
                    <SectionTitle $color="#ff4444" style={{ marginTop: 'var(--space-3)' }}>
                      ⚠️ RISKS TO CONSIDER
                    </SectionTitle>
                    {explanation.risk_factors.slice(0, 2).map((factor, idx) => (
                      <FactorItem key={idx} $color="#ff4444">
                        <FactorHeader>
                          <FactorName>{factor.factor_name}</FactorName>
                          <ImpactBadge $value={-Math.abs(factor.impact_score)}>
                            Risk {Math.abs(factor.impact_score).toFixed(0)}
                          </ImpactBadge>
                        </FactorHeader>
                        <FactorDescription>{factor.description}</FactorDescription>
                      </FactorItem>
                    ))}
                  </>
                )}
              </ExplanationSection>
            )}

            {/* Performance Metrics */}
            {strategy.performance && (
              <PerformanceFooter>
                <div>
                  <PerformanceMetric>
                    {strategy.performance.computation_time_ms}ms
                  </PerformanceMetric>
                </div>
                <div>
                  <PerformanceMetric>
                    {strategy.performance.cpu_cores} cores
                  </PerformanceMetric>
                </div>
                <div>
                  <PerformanceMetric>
                    {strategy.performance.throughput}
                  </PerformanceMetric>
                </div>
              </PerformanceFooter>
            )}
          </>
        )}
      </StrategyContent>
    </DraggableSidebar>
  );
}

