/**
 * Betting & Backtesting Table
 * 
 * Shows betting odds and backtesting P&L in bottom-right of screen.
 * Answers: "Would my ML predictions have made money?"
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const TableContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--colour-border);
  background: var(--colour-bg);
`;

const TabBar = styled.div`
  display: flex;
  background-color: var(--colour-offset);
  border-bottom: 1px solid var(--colour-border);
`;

const Tab = styled.button`
  flex: 1;
  padding: var(--space-2) var(--space-3);
  background: ${props => props.$active ? 'var(--colour-bg)' : 'transparent'};
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#e10600' : 'transparent'};
  color: ${props => props.$active ? 'var(--colour-fg)' : '#888'};
  font-weight: ${props => props.$active ? '700' : '400'};
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--colour-fg);
  }
`;

const PanelHeader = styled.div`
  padding: var(--space-2) var(--space-3);
  background-color: var(--colour-offset);
  border-bottom: 1px solid var(--colour-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.p`
  margin: 0;
  font-weight: 700;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Badge = styled.span`
  background: ${props => props.$color || 'rgba(225, 6, 0, 0.3)'};
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

const ScrollContent = styled.div`
  flex: 1;
  overflow-y: auto;
  max-height: 300px;
`;

// Odds Table
const OddsGrid = styled.div`
  display: grid;
  grid-template-columns: 70px 1fr 80px 80px 80px;
  padding: var(--space-2) var(--space-2) var(--space-1) var(--space-2);
  background-color: var(--colour-offset);
  gap: var(--space-2);
  font-size: 10px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const OddsRow = styled.div`
  display: grid;
  grid-template-columns: 70px 1fr 80px 80px 80px;
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
`;

const OddsValue = styled.div`
  font-family: 'Roboto Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.$color || 'var(--colour-fg)'};
  text-align: center;
`;

const Probability = styled.div`
  font-size: 11px;
  color: #888;
  text-align: center;
`;

// Backtest Summary
const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  padding: var(--space-3);
  background-color: var(--colour-offset);
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  padding: var(--space-2);
  border-radius: 4px;
  text-align: center;
  border-left: 3px solid ${props => props.$color || '#888'};
`;

const StatLabel = styled.div`
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.$color || 'var(--colour-fg)'};
  font-family: 'Roboto Mono', monospace;
`;

const StatSubtext = styled.div`
  font-size: 10px;
  color: #666;
  margin-top: 2px;
`;

// Bet History
const BetHistoryList = styled.div`
  padding: var(--space-2);
`;

const BetCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
  padding: var(--space-2);
  margin-bottom: var(--space-2);
  border-left: 3px solid ${props => props.$won ? '#00ff88' : '#ff4444'};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const BetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const BetDriver = styled.span`
  font-weight: 600;
  font-size: 12px;
  color: ${props => props.$color ? `#${props.$color}` : 'var(--colour-fg)'};
`;

const BetOutcome = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${props => props.$won ? '#00ff88' : '#ff4444'};
`;

const BetDetails = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #888;
`;

const BetProfit = styled.span`
  font-family: 'Roboto Mono', monospace;
  font-weight: 700;
  color: ${props => props.$value >= 0 ? '#00ff88' : '#ff4444'};
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


export default function BettingBacktestTable({
  sessionKey,
  drivers = [],
  predictions = {},
  actualResults = {},
  showOdds = true,
  showBacktest = true
}) {
  const [activeTab, setActiveTab] = useState('odds');
  const [backtestResults, setBacktestResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // Calculate odds from predictions
  const calculateOdds = (probability) => {
    if (probability <= 0) return '999.00';
    if (probability >= 1) return '1.01';
    
    // Decimal odds with 5% margin
    const fairOdds = 1 / probability;
    const adjustedProb = probability * 1.05;
    const decimalOdds = 1 / Math.min(adjustedProb, 0.99);
    
    return decimalOdds.toFixed(2);
  };

  const calculateAmericanOdds = (decimalOdds) => {
    const decimal = parseFloat(decimalOdds);
    if (decimal >= 2.0) {
      return `+${Math.round((decimal - 1) * 100)}`;
    } else {
      return `${Math.round(-100 / (decimal - 1))}`;
    }
  };

  // Run backtest
  const runBacktest = async () => {
    if (!sessionKey || Object.keys(predictions).length === 0 || Object.keys(actualResults).length === 0) {
      return;
    }

    setLoading(true);
    
    try {
      // Simulate backtesting locally for demo
      const bets = [];
      let bankroll = 1000;
      let totalStaked = 0;
      let totalReturned = 0;

      Object.entries(predictions).forEach(([driverNum, pred]) => {
        const actual = actualResults[driverNum];
        if (!actual) return;

        const winProb = pred.win_probability || 0.05;
        const decimalOdds = parseFloat(calculateOdds(winProb));
        
        // Kelly criterion bet sizing
        const b = decimalOdds - 1;
        const p = winProb;
        const q = 1 - p;
        const kellyFraction = Math.max(0, (b * p - q) / b) * 0.25; // 25% Kelly
        
        const stake = Math.min(bankroll * kellyFraction, bankroll * 0.10);
        
        if (stake < 1) return;

        const won = actual.position === 1;
        const payout = won ? stake * decimalOdds : 0;
        const profit = payout - stake;

        bets.push({
          driver_number: parseInt(driverNum),
          stake,
          decimalOdds,
          won,
          payout,
          profit
        });

        totalStaked += stake;
        totalReturned += payout;
        bankroll += profit;
      });

      const winningBets = bets.filter(b => b.won).length;
      const winRate = bets.length > 0 ? (winningBets / bets.length) : 0;
      const netProfit = totalReturned - totalStaked;
      const roi = totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0;

      setBacktestResults({
        total_bets: bets.length,
        winning_bets: winningBets,
        losing_bets: bets.length - winningBets,
        win_rate: winRate,
        total_staked: totalStaked,
        total_returned: totalReturned,
        net_profit: netProfit,
        roi: roi,
        final_bankroll: bankroll,
        bet_history: bets
      });

    } catch (err) {
      console.error('Backtest error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'backtest' && !backtestResults) {
      runBacktest();
    }
  }, [activeTab, predictions, actualResults]);

  const sortedDrivers = drivers.sort((a, b) => {
    const predA = predictions[a.driver_number || a.number];
    const predB = predictions[b.driver_number || b.number];
    const probA = predA?.win_probability || 0;
    const probB = predB?.win_probability || 0;
    return probB - probA;
  });

  return (
    <TableContainer>
      <TabBar>
        <Tab $active={activeTab === 'odds'} onClick={() => setActiveTab('odds')}>
          📊 BETTING ODDS
        </Tab>
        <Tab $active={activeTab === 'backtest'} onClick={() => setActiveTab('backtest')}>
          💰 BACKTEST P&L
        </Tab>
      </TabBar>

      {activeTab === 'odds' && (
        <>
          <PanelHeader>
            <Title>
              LIVE BETTING ODDS
              <Badge $color="rgba(0, 191, 255, 0.4)">ML-POWERED</Badge>
            </Title>
          </PanelHeader>

          <OddsGrid>
            <div>DRIVER</div>
            <div>NAME</div>
            <div style={{ textAlign: 'center' }}>WIN</div>
            <div style={{ textAlign: 'center' }}>PODIUM</div>
            <div style={{ textAlign: 'center' }}>POINTS</div>
          </OddsGrid>

          <ScrollContent>
            {sortedDrivers.length === 0 ? (
              <EmptyState>
                <div>⏳ No predictions available</div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  Run ML predictions first
                </div>
              </EmptyState>
            ) : (
              sortedDrivers.slice(0, 10).map(driver => {
                const driverNum = driver.driver_number || driver.number;
                const pred = predictions[driverNum] || {};
                
                const winProb = pred.win_probability || 0.05;
                const podiumProb = pred.podium_probability || 0.15;
                const pointsProb = pred.points_probability || 0.50;
                
                const winOdds = calculateOdds(winProb);
                const podiumOdds = calculateOdds(podiumProb);
                const pointsOdds = calculateOdds(pointsProb);

                return (
                  <OddsRow key={driverNum}>
                    <DriverLabel $color={driver.team_colour || driver.TeamColour}>
                      {driverNum} {driver.name_acronym || driver.tla || driver.Tla}
                    </DriverLabel>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {driver.full_name || driver.name || '—'}
                    </div>
                    <div>
                      <OddsValue $color={winProb > 0.2 ? '#00ff88' : '#ffaa00'}>
                        {winOdds}
                      </OddsValue>
                      <Probability>{(winProb * 100).toFixed(1)}%</Probability>
                    </div>
                    <div>
                      <OddsValue>{podiumOdds}</OddsValue>
                      <Probability>{(podiumProb * 100).toFixed(1)}%</Probability>
                    </div>
                    <div>
                      <OddsValue>{pointsOdds}</OddsValue>
                      <Probability>{(pointsProb * 100).toFixed(1)}%</Probability>
                    </div>
                  </OddsRow>
                );
              })
            )}
          </ScrollContent>
        </>
      )}

      {activeTab === 'backtest' && (
        <>
          <PanelHeader>
            <Title>
              BACKTEST RESULTS
              <Badge $color={backtestResults?.net_profit >= 0 ? 'rgba(0, 255, 136, 0.4)' : 'rgba(255, 68, 68, 0.4)'}>
                {backtestResults ? (backtestResults.net_profit >= 0 ? 'PROFIT' : 'LOSS') : 'PENDING'}
              </Badge>
            </Title>
          </PanelHeader>

          {loading ? (
            <EmptyState>
              <div>⏳ Running backtest...</div>
            </EmptyState>
          ) : !backtestResults ? (
            <EmptyState>
              <div>📊 No backtest data</div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                Need predictions and actual results
              </div>
            </EmptyState>
          ) : (
            <>
              <SummaryGrid>
                <StatCard $color={backtestResults.net_profit >= 0 ? '#00ff88' : '#ff4444'}>
                  <StatLabel>Net P&L</StatLabel>
                  <StatValue $color={backtestResults.net_profit >= 0 ? '#00ff88' : '#ff4444'}>
                    ${backtestResults.net_profit.toFixed(2)}
                  </StatValue>
                  <StatSubtext>
                    ${backtestResults.final_bankroll.toFixed(0)} bankroll
                  </StatSubtext>
                </StatCard>

                <StatCard $color={backtestResults.roi >= 0 ? '#00ff88' : '#ff4444'}>
                  <StatLabel>ROI</StatLabel>
                  <StatValue $color={backtestResults.roi >= 0 ? '#00ff88' : '#ff4444'}>
                    {backtestResults.roi.toFixed(1)}%
                  </StatValue>
                  <StatSubtext>
                    ${backtestResults.total_returned.toFixed(0)} returned
                  </StatSubtext>
                </StatCard>

                <StatCard $color="#00bfff">
                  <StatLabel>Win Rate</StatLabel>
                  <StatValue>
                    {(backtestResults.win_rate * 100).toFixed(1)}%
                  </StatValue>
                  <StatSubtext>
                    {backtestResults.winning_bets}/{backtestResults.total_bets} bets
                  </StatSubtext>
                </StatCard>
              </SummaryGrid>

              <div style={{ 
                padding: 'var(--space-2) var(--space-3)', 
                background: 'var(--colour-offset)',
                borderTop: '1px solid var(--colour-border)',
                fontSize: '11px',
                fontWeight: '600',
                color: '#888'
              }}>
                BET HISTORY
              </div>

              <ScrollContent>
                <BetHistoryList>
                  {backtestResults.bet_history.slice(0, 10).map((bet, idx) => {
                    const driver = drivers.find(d => (d.driver_number || d.number) === bet.driver_number);
                    return (
                      <BetCard key={idx} $won={bet.won}>
                        <BetHeader>
                          <BetDriver $color={driver?.team_colour || driver?.TeamColour}>
                            #{bet.driver_number} {driver?.name_acronym || driver?.tla || 'Unknown'}
                          </BetDriver>
                          <BetOutcome $won={bet.won}>
                            {bet.won ? '✓ WON' : '✗ LOST'}
                          </BetOutcome>
                        </BetHeader>
                        <BetDetails>
                          <span>Stake: ${bet.stake.toFixed(2)} @ {bet.decimalOdds}</span>
                          <BetProfit $value={bet.profit}>
                            {bet.profit >= 0 ? '+' : ''}${bet.profit.toFixed(2)}
                          </BetProfit>
                        </BetDetails>
                      </BetCard>
                    );
                  })}
                </BetHistoryList>
              </ScrollContent>
            </>
          )}
        </>
      )}
    </TableContainer>
  );
}

