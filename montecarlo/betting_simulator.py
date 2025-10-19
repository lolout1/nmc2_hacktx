"""
F1 Betting Simulator & Backtesting Engine
==========================================
Converts ML predictions into betting odds and tracks profit/loss.

Simulates betting strategies based on ML confidence levels.
Shows if predictions would have made or lost money in real races.
"""

import json
import sys
import os
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
from dataclasses import dataclass, asdict


@dataclass
class BettingOdds:
    """Betting odds for various outcomes"""
    driver_number: int
    driver_name: str
    
    # Win odds
    win_probability: float
    win_decimal_odds: float  # e.g., 3.50 means $1 wins $3.50
    win_american_odds: int   # e.g., +250 or -150
    
    # Podium odds
    podium_probability: float
    podium_decimal_odds: float
    
    # Points odds
    points_probability: float
    points_decimal_odds: float
    
    # Expected value
    expected_value: float
    kelly_bet_size: float  # Kelly criterion optimal bet size


@dataclass
class BettingResult:
    """Result of a single bet"""
    bet_type: str  # 'WIN', 'PODIUM', 'POINTS'
    driver_number: int
    predicted_probability: float
    decimal_odds: float
    stake: float
    actual_outcome: bool
    payout: float
    profit: float


@dataclass
class BacktestSummary:
    """Summary of backtesting results"""
    total_bets: int
    winning_bets: int
    losing_bets: int
    win_rate: float
    total_staked: float
    total_returned: float
    net_profit: float
    roi: float  # Return on Investment
    sharpe_ratio: float
    max_drawdown: float


class BettingOddsCalculator:
    """
    Converts ML probabilities to betting odds
    
    Uses no-vig (fair) odds, then applies margin for realistic odds
    """
    
    def __init__(self, bookmaker_margin: float = 0.05):
        """
        Args:
            bookmaker_margin: Typical bookmaker margin (5% = 1.05 overround)
        """
        self.margin = bookmaker_margin
    
    def probability_to_decimal_odds(self, probability: float, apply_margin: bool = True) -> float:
        """
        Convert probability to decimal odds
        
        Args:
            probability: Win probability (0-1)
            apply_margin: Apply bookmaker margin (realistic odds)
            
        Returns:
            Decimal odds (e.g., 3.50)
        """
        if probability <= 0:
            return 999.0
        if probability >= 1:
            return 1.01
        
        # Fair odds
        fair_odds = 1 / probability
        
        # Apply margin (makes odds worse for bettor)
        if apply_margin:
            adjusted_prob = probability * (1 + self.margin)
            adjusted_odds = 1 / min(adjusted_prob, 0.99)
            return round(adjusted_odds, 2)
        
        return round(fair_odds, 2)
    
    def decimal_to_american_odds(self, decimal_odds: float) -> int:
        """
        Convert decimal odds to American odds
        
        Args:
            decimal_odds: Decimal odds (e.g., 3.50)
            
        Returns:
            American odds (e.g., +250)
        """
        if decimal_odds >= 2.0:
            # Underdog: positive American odds
            return int((decimal_odds - 1) * 100)
        else:
            # Favorite: negative American odds
            return int(-100 / (decimal_odds - 1))
    
    def calculate_kelly_criterion(
        self,
        probability: float,
        decimal_odds: float,
        bankroll: float = 1000.0
    ) -> float:
        """
        Calculate Kelly Criterion optimal bet size
        
        f* = (bp - q) / b
        where:
            b = decimal_odds - 1
            p = probability of winning
            q = probability of losing (1 - p)
            
        Returns:
            Optimal bet size as fraction of bankroll
        """
        if probability <= 0 or decimal_odds <= 1.0:
            return 0.0
        
        b = decimal_odds - 1
        p = probability
        q = 1 - p
        
        kelly_fraction = (b * p - q) / b
        
        # Use fractional Kelly for safety (e.g., 25% Kelly)
        safe_kelly = kelly_fraction * 0.25
        
        # Cap at 10% of bankroll
        return max(0, min(safe_kelly, 0.10))
    
    def generate_odds(
        self,
        driver_predictions: Dict[int, Dict]
    ) -> List[BettingOdds]:
        """
        Generate betting odds for all drivers
        
        Args:
            driver_predictions: Dict mapping driver_number to prediction dict
                              (must include win/podium/points probabilities)
                              
        Returns:
            List of BettingOdds for each driver
        """
        odds_list = []
        
        for driver_num, pred in driver_predictions.items():
            win_prob = pred.get('win_probability', 0.05)
            podium_prob = pred.get('podium_probability', 0.15)
            points_prob = pred.get('points_probability', 0.50)
            expected_val = pred.get('expected_value', 10.0)
            driver_name = pred.get('driver_name', f"Driver #{driver_num}")
            
            # Calculate odds
            win_decimal = self.probability_to_decimal_odds(win_prob)
            podium_decimal = self.probability_to_decimal_odds(podium_prob)
            points_decimal = self.probability_to_decimal_odds(points_prob)
            
            win_american = self.decimal_to_american_odds(win_decimal)
            
            # Kelly criterion
            kelly = self.kelly_criterion(win_prob, win_decimal)
            
            odds_list.append(BettingOdds(
                driver_number=driver_num,
                driver_name=driver_name,
                win_probability=win_prob,
                win_decimal_odds=win_decimal,
                win_american_odds=win_american,
                podium_probability=podium_prob,
                podium_decimal_odds=podium_decimal,
                points_probability=points_prob,
                points_decimal_odds=points_decimal,
                expected_value=expected_val,
                kelly_bet_size=kelly
            ))
        
        # Sort by win probability
        odds_list.sort(key=lambda x: x.win_probability, reverse=True)
        
        return odds_list


class BettingBacktester:
    """
    Backtest betting strategies against historical results
    
    Simulates placing bets based on ML predictions and calculates P&L
    """
    
    def __init__(self, initial_bankroll: float = 1000.0):
        self.initial_bankroll = initial_bankroll
        self.current_bankroll = initial_bankroll
        self.bet_history: List[BettingResult] = []
        self.bankroll_history: List[float] = [initial_bankroll]
    
    def place_bet(
        self,
        bet_type: str,
        driver_number: int,
        predicted_probability: float,
        decimal_odds: float,
        stake: float
    ) -> BettingResult:
        """
        Record a bet (outcome determined later)
        
        Args:
            bet_type: 'WIN', 'PODIUM', or 'POINTS'
            driver_number: Driver number
            predicted_probability: ML-predicted probability
            decimal_odds: Betting odds
            stake: Amount wagered
            
        Returns:
            BettingResult (with outcome=None until settled)
        """
        return BettingResult(
            bet_type=bet_type,
            driver_number=driver_number,
            predicted_probability=predicted_probability,
            decimal_odds=decimal_odds,
            stake=stake,
            actual_outcome=None,  # Set when race finishes
            payout=0.0,
            profit=0.0
        )
    
    def settle_bet(
        self,
        bet: BettingResult,
        actual_position: int
    ) -> BettingResult:
        """
        Settle bet based on actual race result
        
        Args:
            bet: BettingResult to settle
            actual_position: Actual finishing position
            
        Returns:
            Updated BettingResult with outcome and profit
        """
        # Determine if bet won
        if bet.bet_type == 'WIN':
            won = (actual_position == 1)
        elif bet.bet_type == 'PODIUM':
            won = (actual_position <= 3)
        elif bet.bet_type == 'POINTS':
            won = (actual_position <= 10)
        else:
            won = False
        
        # Calculate payout
        if won:
            payout = bet.stake * bet.decimal_odds
            profit = payout - bet.stake
        else:
            payout = 0.0
            profit = -bet.stake
        
        bet.actual_outcome = won
        bet.payout = payout
        bet.profit = profit
        
        # Update bankroll
        self.current_bankroll += profit
        self.bankroll_history.append(self.current_bankroll)
        self.bet_history.append(bet)
        
        return bet
    
    def backtest_strategy(
        self,
        predictions: List[Dict],
        actual_results: List[Dict],
        strategy: str = 'KELLY'
    ) -> BacktestSummary:
        """
        Backtest a betting strategy across multiple races
        
        Args:
            predictions: List of prediction dicts (per race/driver)
            actual_results: List of actual result dicts (per race/driver)
            strategy: 'KELLY', 'FIXED', or 'PROPORTIONAL'
            
        Returns:
            BacktestSummary with performance metrics
        """
        odds_calc = BettingOddsCalculator()
        
        for pred, actual in zip(predictions, actual_results):
            # Skip if mismatched
            if pred['driver_number'] != actual['driver_number']:
                continue
            
            # Determine stake based on strategy
            if strategy == 'KELLY':
                kelly_frac = odds_calc.calculate_kelly_criterion(
                    pred['win_probability'],
                    odds_calc.probability_to_decimal_odds(pred['win_probability'])
                )
                stake = self.current_bankroll * kelly_frac
            elif strategy == 'FIXED':
                stake = 10.0  # Fixed $10 per bet
            else:  # PROPORTIONAL
                stake = self.current_bankroll * 0.02  # 2% of bankroll
            
            # Skip if bankroll too low
            if stake < 1.0 or self.current_bankroll < stake:
                continue
            
            # Place and settle bet
            decimal_odds = odds_calc.probability_to_decimal_odds(pred['win_probability'])
            
            bet = self.place_bet(
                'WIN',
                pred['driver_number'],
                pred['win_probability'],
                decimal_odds,
                stake
            )
            
            self.settle_bet(bet, actual['actual_position'])
        
        # Calculate summary statistics
        return self._calculate_summary()
    
    def _calculate_summary(self) -> BacktestSummary:
        """Calculate backtesting summary statistics"""
        if len(self.bet_history) == 0:
            return BacktestSummary(
                total_bets=0,
                winning_bets=0,
                losing_bets=0,
                win_rate=0.0,
                total_staked=0.0,
                total_returned=0.0,
                net_profit=0.0,
                roi=0.0,
                sharpe_ratio=0.0,
                max_drawdown=0.0
            )
        
        winning_bets = sum(1 for bet in self.bet_history if bet.actual_outcome)
        losing_bets = len(self.bet_history) - winning_bets
        win_rate = winning_bets / len(self.bet_history)
        
        total_staked = sum(bet.stake for bet in self.bet_history)
        total_returned = sum(bet.payout for bet in self.bet_history)
        net_profit = total_returned - total_staked
        roi = (net_profit / total_staked) * 100 if total_staked > 0 else 0
        
        # Sharpe ratio (risk-adjusted return)
        returns = [bet.profit / bet.stake for bet in self.bet_history]
        mean_return = np.mean(returns)
        std_return = np.std(returns)
        sharpe_ratio = (mean_return / std_return) * np.sqrt(len(returns)) if std_return > 0 else 0
        
        # Max drawdown
        peak = self.initial_bankroll
        max_dd = 0
        for balance in self.bankroll_history:
            if balance > peak:
                peak = balance
            dd = ((peak - balance) / peak) * 100
            if dd > max_dd:
                max_dd = dd
        
        return BacktestSummary(
            total_bets=len(self.bet_history),
            winning_bets=winning_bets,
            losing_bets=losing_bets,
            win_rate=win_rate,
            total_staked=total_staked,
            total_returned=total_returned,
            net_profit=net_profit,
            roi=roi,
            sharpe_ratio=sharpe_ratio,
            max_drawdown=max_dd
        )


def load_session_predictions(session_key: str) -> List[Dict]:
    """Load stored predictions for a session"""
    # This would load from a database or cache
    # For now, return empty list
    return []


def load_session_actuals(session_key: str) -> List[Dict]:
    """Load actual race results from OpenF1 cache"""
    cache_dir = os.path.join(os.getcwd(), '.openf1_cache')
    
    # Load positions (final results)
    positions_file = os.path.join(cache_dir, f'session_{session_key}_positions.csv')
    
    if not os.path.exists(positions_file):
        return []
    
    try:
        df = pd.read_csv(positions_file)
        # Get final positions (latest entry per driver)
        final_positions = df.sort_values('date').groupby('driver_number').last()
        
        actuals = []
        for driver_num, row in final_positions.iterrows():
            actuals.append({
                'driver_number': int(driver_num),
                'actual_position': int(row['position'])
            })
        
        return actuals
    except Exception as e:
        print(f"Error loading actual results: {e}")
        return []


if __name__ == '__main__':
    if len(sys.argv) < 2:
        # Demo mode
        print("\n" + "="*70)
        print("BETTING SIMULATOR DEMO")
        print("="*70 + "\n")
        
        # Demo predictions
        driver_predictions = {
            1: {'win_probability': 0.35, 'podium_probability': 0.70, 'points_probability': 0.95, 'expected_value': 18.5, 'driver_name': 'Verstappen'},
            44: {'win_probability': 0.25, 'podium_probability': 0.60, 'points_probability': 0.90, 'expected_value': 16.2, 'driver_name': 'Hamilton'},
            16: {'win_probability': 0.15, 'podium_probability': 0.45, 'points_probability': 0.80, 'expected_value': 13.5, 'driver_name': 'Leclerc'},
        }
        
        odds_calc = BettingOddsCalculator()
        odds_list = odds_calc.generate_odds(driver_predictions)
        
        print("BETTING ODDS:")
        print("-" * 70)
        for odds in odds_list:
            print(f"\n{odds.driver_name} (#{odds.driver_number})")
            print(f"  Win: {odds.win_probability*100:.1f}% → {odds.win_decimal_odds} ({odds.win_american_odds:+d})")
            print(f"  Podium: {odds.podium_probability*100:.1f}% → {odds.podium_decimal_odds}")
            print(f"  Points: {odds.points_probability*100:.1f}% → {odds.points_decimal_odds}")
            print(f"  Kelly Bet: {odds.kelly_bet_size*100:.1f}% of bankroll")
        
        print("\n" + "="*70)
    else:
        session_key = sys.argv[1]
        
        # Load data and run backtest
        predictions = load_session_predictions(session_key)
        actuals = load_session_actuals(session_key)
        
        if predictions and actuals:
            backtester = BettingBacktester(initial_bankroll=1000.0)
            summary = backtester.backtest_strategy(predictions, actuals, strategy='KELLY')
            
            print(json.dumps(asdict(summary), indent=2))
        else:
            print(json.dumps({'error': 'No prediction or actual data found'}))

