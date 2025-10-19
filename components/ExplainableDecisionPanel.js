/**
 * Explainable AI Decision Panel
 * 
 * Shows WHY a strategy decision was made with ranked factors,
 * risks, and opportunities - helping race engineers understand
 * complex HPC simulation results.
 */

import React, { useState } from 'react';
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

const XAIBadge = styled.span`
  background: linear-gradient(135deg, #00bfff 0%, #0080ff 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
`;

const ExplainButton = styled.button`
  background: ${props => props.disabled ? '#555' : 'linear-gradient(135deg, #00bfff 0%, #0080ff 100%)'};
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
  font-size: 13px;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 191, 255, 0.4);
  }
`;

const DecisionSummary = styled.div`
  background: rgba(0, 191, 255, 0.1);
  border-left: 4px solid #00bfff;
  padding: 15px;
  border-radius: 6px;
  margin: 15px 0;
`;

const SummaryText = styled.p`
  color: white;
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
`;

const ConfidenceMeter = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
`;

const ConfidenceBar = styled.div`
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.confidence}%;
    background: linear-gradient(90deg, #00bfff, #00ff88);
    transition: width 0.5s ease;
  }
`;

const ConfidenceLabel = styled.span`
  color: #00ff88;
  font-weight: 700;
  font-size: 14px;
  min-width: 45px;
`;

const FactorsSection = styled.div`
  margin: 20px 0;
`;

const SectionTitle = styled.h4`
  color: ${props => props.color || '#fff'};
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 15px 0 10px 0;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const FactorCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
  border-left: 3px solid ${props => {
    if (props.impact > 0) return '#00ff88';
    if (props.impact < 0) return '#ff4444';
    return '#ffcc00';
  }};
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(4px);
  }
`;

const FactorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const FactorName = styled.span`
  color: white;
  font-weight: 600;
  font-size: 13px;
`;

const ImpactBadge = styled.span`
  background: ${props => {
    const abs = Math.abs(props.value);
    if (abs > 50) return props.value > 0 ? '#00ff88' : '#ff4444';
    return '#ffcc00';
  }};
  color: #000;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
`;

const FactorDescription = styled.p`
  color: #aaa;
  font-size: 12px;
  margin: 4px 0 0 0;
  line-height: 1.4;
`;

const AlternativesSection = styled.div`
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const AlternativeCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  padding: 10px;
  margin: 6px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const AlternativeAction = styled.span`
  color: #ccc;
  font-size: 12px;
  font-weight: 600;
`;

const AlternativeReason = styled.span`
  color: #888;
  font-size: 11px;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
  font-size: 13px;
`;

const ErrorState = styled.div`
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid rgba(255, 68, 68, 0.3);
  border-radius: 6px;
  padding: 12px;
  color: #ff4444;
  font-size: 13px;
  margin-top: 15px;
`;


export default function ExplainableDecisionPanel({ 
  decision,
  driverState,
  simulationResults,
  sessionData,
  autoExplain = false
}) {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateExplanation = async () => {
    if (!decision || !driverState) {
      setError('Missing decision or driver state');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ml/explain-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          driver_state: driverState,
          simulation_results: simulationResults || {},
          session_data: sessionData || {}
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setExplanation(data);
    } catch (err) {
      console.error('Failed to generate explanation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-explain on mount if enabled
  React.useEffect(() => {
    if (autoExplain && decision && driverState) {
      generateExplanation();
    }
  }, [decision, driverState, autoExplain]);

  const formatActionName = (action) => {
    return action.replace(/_/g, ' ');
  };

  return (
    <Panel>
      <Header>
        <Title>
          Decision Explanation
          <XAIBadge>EXPLAINABLE AI</XAIBadge>
        </Title>
        {!autoExplain && (
          <ExplainButton 
            onClick={generateExplanation}
            disabled={loading || !decision || !driverState}
          >
            {loading ? 'Analyzing...' : 'Explain Why'}
          </ExplainButton>
        )}
      </Header>

      {loading && (
        <LoadingState>
          🧠 Analyzing decision factors...
        </LoadingState>
      )}

      {error && (
        <ErrorState>
          ⚠️ {error}
        </ErrorState>
      )}

      {explanation && !loading && (
        <>
          <DecisionSummary>
            <SummaryText>{explanation.summary}</SummaryText>
            <ConfidenceMeter>
              <ConfidenceBar confidence={explanation.overall_confidence} />
              <ConfidenceLabel>{explanation.overall_confidence}%</ConfidenceLabel>
            </ConfidenceMeter>
          </DecisionSummary>

          {explanation.primary_factors && explanation.primary_factors.length > 0 && (
            <FactorsSection>
              <SectionTitle color="#00ff88">
                ✓ Primary Factors Supporting This Decision
              </SectionTitle>
              {explanation.primary_factors.map((factor, idx) => (
                <FactorCard key={idx} impact={factor.impact_score}>
                  <FactorHeader>
                    <FactorName>{factor.factor_name}</FactorName>
                    <ImpactBadge value={factor.impact_score}>
                      {factor.impact_score > 0 ? '+' : ''}{factor.impact_score.toFixed(0)}
                    </ImpactBadge>
                  </FactorHeader>
                  <FactorDescription>{factor.description}</FactorDescription>
                </FactorCard>
              ))}
            </FactorsSection>
          )}

          {explanation.risk_factors && explanation.risk_factors.length > 0 && (
            <FactorsSection>
              <SectionTitle color="#ff4444">
                ⚠️ Risk Factors to Consider
              </SectionTitle>
              {explanation.risk_factors.map((factor, idx) => (
                <FactorCard key={idx} impact={factor.impact_score}>
                  <FactorHeader>
                    <FactorName>{factor.factor_name}</FactorName>
                    <ImpactBadge value={factor.impact_score}>
                      Risk: {Math.abs(factor.impact_score).toFixed(0)}
                    </ImpactBadge>
                  </FactorHeader>
                  <FactorDescription>{factor.description}</FactorDescription>
                </FactorCard>
              ))}
            </FactorsSection>
          )}

          {explanation.opportunity_factors && explanation.opportunity_factors.length > 0 && (
            <FactorsSection>
              <SectionTitle color="#00bfff">
                💡 Opportunities
              </SectionTitle>
              {explanation.opportunity_factors.map((factor, idx) => (
                <FactorCard key={idx} impact={factor.impact_score}>
                  <FactorHeader>
                    <FactorName>{factor.factor_name}</FactorName>
                    <ImpactBadge value={factor.impact_score}>
                      +{Math.abs(factor.impact_score).toFixed(0)}
                    </ImpactBadge>
                  </FactorHeader>
                  <FactorDescription>{factor.description}</FactorDescription>
                </FactorCard>
              ))}
            </FactorsSection>
          )}

          {explanation.alternatives_considered && explanation.alternatives_considered.length > 0 && (
            <AlternativesSection>
              <SectionTitle color="#888">Why Not These Alternatives?</SectionTitle>
              {explanation.alternatives_considered.map((alt, idx) => (
                <AlternativeCard key={idx}>
                  <AlternativeAction>{formatActionName(alt.action)}</AlternativeAction>
                  <AlternativeReason>{alt.reason}</AlternativeReason>
                </AlternativeCard>
              ))}
            </AlternativesSection>
          )}
        </>
      )}
    </Panel>
  );
}

