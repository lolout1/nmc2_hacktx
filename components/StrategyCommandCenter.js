/**
 * Strategy Command Center
 * Displays HPC-calculated optimal strategies for selected driver
 * Converts complex simulations into actionable decisions
 */
import styled from "styled-components";
import { useState, useEffect } from "react";
import DraggableSidebar from "./DraggableSidebar";

const StrategyContent = styled.div`
  padding: var(--space-3);
  min-width: 320px;
  max-width: 400px;
  max-height: 700px;
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

const TopDecision = styled.div`
  background: linear-gradient(135deg, rgba(0, 180, 255, 0.15) 0%, rgba(0, 180, 255, 0.05) 100%);
  border: 2px solid rgba(0, 180, 255, 0.5);
  border-radius: 8px;
  padding: var(--space-3);
  margin-bottom: var(--space-3);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, rgba(0, 180, 255, 1), transparent);
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
`;

const ActionLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(0, 180, 255, 1);
  margin-bottom: var(--space-2);
`;

const ActionText = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: var(--colour-fg);
  margin-bottom: var(--space-2);
  text-transform: uppercase;
`;

const ConfidenceBar = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
`;

const ConfidenceLabel = styled.span`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
`;

const ConfidenceProgress = styled.div`
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: ${props => props.$value}%;
    background: ${props => {
      if (props.$value >= 80) return 'limegreen';
      if (props.$value >= 60) return 'yellow';
      return 'orange';
    }};
    transition: width 0.5s ease;
  }
`;

const ConfidenceValue = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${props => {
    if (props.$value >= 80) return 'limegreen';
    if (props.$value >= 60) return 'yellow';
    return 'orange';
  }};
`;

const ExpectedOutcome = styled.div`
  font-size: 13px;
  color: limegreen;
  font-weight: 600;
`;

const SectionTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: var(--space-2);
  padding-bottom: var(--space-1);
  border-bottom: 1px solid var(--colour-border);
`;

const AlternativesList = styled.div`
  margin-bottom: var(--space-4);
`;

const Alternative = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--colour-offset);
  border-radius: 4px;
  margin-bottom: var(--space-2);
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(4px);
  }
`;

const Rank = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  min-width: 24px;
`;

const AltAction = styled.span`
  flex: 1;
  font-size: 13px;
  font-weight: 600;
`;

const AltConfidence = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
`;

const PitWindowPanel = styled.div`
  background: rgba(255, 165, 0, 0.1);
  border: 1px solid rgba(255, 165, 0, 0.3);
  border-radius: 6px;
  padding: var(--space-3);
  margin-bottom: var(--space-3);
`;

const WindowLap = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: orange;
  text-align: center;
  margin: var(--space-2) 0;
`;

const WindowDetails = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  
  div {
    margin-bottom: 4px;
  }
`;

const RiskPanel = styled.div`
  background: ${props => {
    if (props.$risk === 'LOW') return 'rgba(0, 255, 0, 0.1)';
    if (props.$risk === 'MEDIUM') return 'rgba(255, 255, 0, 0.1)';
    return 'rgba(255, 0, 0, 0.1)';
  }};
  border: 1px solid ${props => {
    if (props.$risk === 'LOW') return 'rgba(0, 255, 0, 0.3)';
    if (props.$risk === 'MEDIUM') return 'rgba(255, 255, 0, 0.3)';
    return 'rgba(255, 0, 0, 0.3)';
  }};
  border-radius: 6px;
  padding: var(--space-3);
`;

const RiskLevel = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${props => {
    if (props.$risk === 'LOW') return 'limegreen';
    if (props.$risk === 'MEDIUM') return 'yellow';
    return 'red';
  }};
  text-align: center;
  margin: var(--space-2) 0;
`;

const RiskFactors = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
`;

const Factor = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  
  &:last-child {
    border-bottom: none;
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  color: rgba(255, 255, 255, 0.5);
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(0, 180, 255, 0.2);
    border-top-color: rgba(0, 180, 255, 1);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--space-3);
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const StrategyCommandCenter = ({ 
  focusDriver,
  driverList = {},
  timingData = {},
  sessionData = {}
}) => {
  const [strategies, setStrategies] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch strategies for selected driver
  useEffect(() => {
    console.log('[Strategy] Effect triggered:', {
      focusDriver,
      hasSessionData: !!sessionData,
      sessionKey: sessionData?.session_key
    });

    if (!focusDriver) {
      console.log('[Strategy] No focus driver selected');
      setStrategies(null);
      return;
    }

    if (!sessionData?.session_key) {
      console.warn('[Strategy] No session_key available in sessionData:', sessionData);
      setError('Session data not ready. Please wait...');
      return;
    }

    const fetchStrategies = async () => {
      setLoading(true);
      setError(null);

      console.log(`[Strategy] Fetching strategies for driver ${focusDriver}, session ${sessionData.session_key}`);

      try {
        const url = `/api/strategy/driver?sessionKey=${sessionData.session_key}&driverNumber=${focusDriver}`;
        console.log('[Strategy] API URL:', url);
        
        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Strategy] API error response:', errorText);
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('[Strategy] Received data:', data);
        
        setStrategies(data.strategies);
        console.log('[Strategy] ✓ Strategies loaded successfully');
      } catch (err) {
        console.error('[Strategy] Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();

    // Refresh every 15 seconds
    const interval = setInterval(fetchStrategies, 15000);
    return () => clearInterval(interval);
  }, [focusDriver, sessionData?.session_key]);

  if (!focusDriver) {
    return null;
  }

  const driver = driverList[focusDriver];
  if (!driver) {
    return null;
  }

  const position = driver.Line?.Position || '?';
  const driverName = driver.BroadcastName || driver.Tla || `#${focusDriver}`;
  const teamName = driver.TeamName || '';
  const teamColor = driver.TeamColour;

  return (
    <DraggableSidebar
      title={`🎯 ${driver.Tla || driverName} Strategy`}
      defaultPosition={{ x: 20, y: window.innerHeight / 2 - 200 }}
      zIndex={150}
      storageKey={`strategy-center-${focusDriver}`}
      icon="⚡"
    >
      <StrategyContent>
        {/* Driver Header */}
        <DriverHeader $teamColor={teamColor}>
          <DriverInfo>
            <DriverName>{driverName}</DriverName>
            <DriverTeam>{teamName}</DriverTeam>
          </DriverInfo>
          <CurrentPosition $pos={position}>
            P{position}
          </CurrentPosition>
        </DriverHeader>

        {/* Loading State */}
        {loading && !strategies && (
          <LoadingState>
            <div className="spinner" />
            <div>Computing optimal strategies...</div>
            <div style={{ fontSize: '11px', marginTop: '8px' }}>
              Running 10,000 simulations
            </div>
          </LoadingState>
        )}

        {/* Error State */}
        {error && (
          <div style={{ 
            padding: 'var(--space-3)', 
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            borderRadius: '4px',
            color: 'red',
            fontSize: '12px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Strategies Display */}
        {strategies && (
          <>
            {/* Top Decision */}
            <TopDecision>
              <ActionLabel>⚡ RECOMMENDED ACTION</ActionLabel>
              <ActionText>{strategies.topDecision.action}</ActionText>
              
              <ConfidenceBar>
                <ConfidenceLabel>Confidence:</ConfidenceLabel>
                <ConfidenceProgress $value={strategies.topDecision.confidence} />
                <ConfidenceValue $value={strategies.topDecision.confidence}>
                  {strategies.topDecision.confidence}%
                </ConfidenceValue>
              </ConfidenceBar>
              
              <ExpectedOutcome>
                {strategies.topDecision.expectedOutcome}
              </ExpectedOutcome>
            </TopDecision>

            {/* Alternative Strategies */}
            {strategies.alternatives && strategies.alternatives.length > 0 && (
              <>
                <SectionTitle>Alternative Strategies</SectionTitle>
                <AlternativesList>
                  {strategies.alternatives.map((alt, i) => (
                    <Alternative key={i}>
                      <Rank>#{i + 2}</Rank>
                      <AltAction>{alt.action}</AltAction>
                      <AltConfidence>{alt.confidence}%</AltConfidence>
                    </Alternative>
                  ))}
                </AlternativesList>
              </>
            )}

            {/* Pit Window */}
            {strategies.pitWindow && (
              <PitWindowPanel>
                <SectionTitle>🔧 Optimal Pit Window</SectionTitle>
                <WindowLap>LAP {strategies.pitWindow.optimal}</WindowLap>
                <WindowDetails>
                  <div>✅ Safe Window: L{strategies.pitWindow.min}-L{strategies.pitWindow.max}</div>
                  {strategies.pitWindow.avoid && strategies.pitWindow.avoid.length > 0 && (
                    <div>⚠️ Avoid: L{strategies.pitWindow.avoid.join(', L')}</div>
                  )}
                  {strategies.pitWindow.reason && (
                    <div style={{ marginTop: '8px', fontStyle: 'italic' }}>
                      {strategies.pitWindow.reason}
                    </div>
                  )}
                </WindowDetails>
              </PitWindowPanel>
            )}

            {/* Risk Assessment */}
            {strategies.risk && (
              <RiskPanel $risk={strategies.risk.level}>
                <SectionTitle>🎲 Risk Assessment</SectionTitle>
                <RiskLevel $risk={strategies.risk.level}>
                  {strategies.risk.level} RISK
                </RiskLevel>
                <RiskFactors>
                  {strategies.risk.factors && strategies.risk.factors.map((factor, i) => (
                    <Factor key={i}>
                      <span>{factor.name}</span>
                      <span>{factor.value}%</span>
                    </Factor>
                  ))}
                </RiskFactors>
              </RiskPanel>
            )}

            {/* Simulation Info */}
            <div style={{ 
              fontSize: '10px', 
              color: 'rgba(255, 255, 255, 0.4)',
              textAlign: 'center',
              marginTop: 'var(--space-3)'
            }}>
              Based on {strategies.simulations?.toLocaleString() || '10,000'} Monte Carlo simulations
              <br />
              Updated: {new Date().toLocaleTimeString()}
            </div>
          </>
        )}
      </StrategyContent>
    </DraggableSidebar>
  );
};

export default StrategyCommandCenter;

