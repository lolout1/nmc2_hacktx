# F1 Betting Platform

This betting platform mimics Kalshi's interface for Formula 1 race predictions. It integrates with the existing Monaco F1 live timing application to provide real-time betting opportunities.

## Features

### 🎯 Live Betting Sidebar
- **Real-time Integration**: Uses actual F1 driver positions and timing data
- **Dynamic Odds**: Odds automatically adjust based on current race position and performance
- **Quick Betting**: Compact sidebar interface for fast betting during live sessions
- **Live Updates**: Vote counts and odds update in real-time as race progresses

### 🏁 Full Betting Page
- **Complete Dashboard**: Full-page betting interface accessible at `/betting`
- **Multiple Markets**: Race Winner, Podium Finish, Fastest Lap markets
- **Detailed View**: Comprehensive driver information with team colors and statistics
- **Portfolio Management**: Track all active bets with potential payouts

### 💰 Betting Features
- **YES/NO Markets**: Simple binary prediction markets
- **Dynamic Odds**: Calculated based on current race position and gap to leader
- **Real-time Payouts**: Instant calculation of potential winnings
- **Balance Management**: Virtual currency system with $1000 starting balance
- **Bet History**: Track all placed bets with timestamps and outcomes

## Technical Implementation

### Data Integration
- **Driver Data**: Uses `DriverList` from F1 API for driver information
- **Timing Data**: Integrates `TimingData` for real-time position updates
- **Session Info**: Leverages `SessionInfo` for race context
- **Team Colors**: Displays actual F1 team colors for visual identification

### Odds Calculation
```javascript
const calculateOdds = (driverNumber, timingData) => {
  const position = parseInt(driverData.Position) || 20;
  const baseOdds = Math.max(1.5, position * 0.8);
  
  // Adjust based on gap to leader
  if (driverData.GapToLeader) {
    const gapSeconds = parseFloat(driverData.GapToLeader.replace(/[^\d.]/g, '')) || 0;
    const gapMultiplier = Math.max(1, gapSeconds / 10);
    return Math.round(baseOdds * gapMultiplier * 100) / 100;
  }
  
  return Math.round(baseOdds * 100) / 100;
};
```

### UI Design
- **Kalshi-inspired**: Dark theme with green accent colors
- **Responsive**: Works on desktop and mobile devices
- **Real-time**: Updates without page refresh
- **Intuitive**: Simple betting flow with clear information hierarchy

## Usage

### Live Mode Betting
1. Start the application in live mode
2. Wait for F1 session data to load
3. Betting sidebar appears automatically on the right side
4. Click on any driver to place a bet
5. Choose YES/NO and bet amount
6. Track your bets in the sidebar

### Full Betting Page
1. Navigate to `/betting` or click the "🎯 BETTING" button
2. Select a market (Race Winner, Podium Finish, etc.)
3. Browse all drivers with current odds and vote counts
4. Click on a driver card to place a bet
5. View your active bets in the dashboard section

## File Structure

```
pages/
├── betting.js              # Full betting page
└── index.js                # Main app with integrated sidebar

components/
└── BettingSidebar.js       # Live betting sidebar component
```

## Future Enhancements

- **Real Money Integration**: Connect to actual payment systems
- **More Markets**: Add constructor championship, fastest pit stop, etc.
- **Social Features**: Share bets, follow other bettors
- **Advanced Analytics**: Historical performance, betting trends
- **Mobile App**: Dedicated mobile application
- **Live Chat**: Community discussion during races

## Disclaimer

This is a demonstration platform for educational purposes. It uses virtual currency and simulated betting. No real money is involved in this implementation.
