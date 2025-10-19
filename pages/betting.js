import { useState, useEffect } from "react";
import Head from "next/head";
import moment from "moment";

// Mock betting data - in a real app this would come from an API
const mockBettingData = {
  drivers: [
    { id: 1, name: "Max VERSTAPPEN", team: "Red Bull Racing", odds: 1.85, votes: 1250, color: "#3671C6" },
    { id: 2, name: "Lewis HAMILTON", team: "Mercedes", odds: 3.20, votes: 890, color: "#6CD3BF" },
    { id: 3, name: "Charles LECLERC", team: "Ferrari", odds: 4.50, votes: 650, color: "#F91536" },
    { id: 4, name: "Lando NORRIS", team: "McLaren", odds: 5.20, votes: 520, color: "#F58020" },
    { id: 5, name: "Carlos SAINZ", team: "Ferrari", odds: 6.80, votes: 380, color: "#F91536" },
    { id: 6, name: "Sergio PEREZ", team: "Red Bull Racing", odds: 8.50, votes: 290, color: "#3671C6" },
    { id: 7, name: "George RUSSELL", team: "Mercedes", odds: 12.00, votes: 180, color: "#6CD3BF" },
    { id: 8, name: "Fernando ALONSO", team: "Aston Martin", odds: 15.50, votes: 140, color: "#358C75" },
    { id: 9, name: "Oscar PIASTRI", team: "McLaren", odds: 18.00, votes: 95, color: "#F58020" },
    { id: 10, name: "Pierre GASLY", team: "Alpine", odds: 25.00, votes: 65, color: "#2293D1" },
  ],
  markets: [
    { id: 1, title: "Race Winner", description: "Who will win the race?", totalVolume: 12500, endTime: "2024-01-15T15:00:00Z" },
    { id: 2, title: "Podium Finish", description: "Will driver finish in top 3?", totalVolume: 8500, endTime: "2024-01-15T15:00:00Z" },
    { id: 3, title: "Fastest Lap", description: "Who will set the fastest lap?", totalVolume: 3200, endTime: "2024-01-15T15:00:00Z" },
  ]
};

export default function BettingPage() {
  const [selectedMarket, setSelectedMarket] = useState(1);
  const [userBets, setUserBets] = useState({});
  const [userBalance, setUserBalance] = useState(1000);
  const [showBettingModal, setShowBettingModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [betAmount, setBetAmount] = useState(0);
  const [betType, setBetType] = useState("YES"); // YES or NO

  const currentMarket = mockBettingData.markets.find(m => m.id === selectedMarket);
  const drivers = mockBettingData.drivers;

  const handlePlaceBet = () => {
    if (betAmount <= 0 || betAmount > userBalance) return;
    
    const betId = `${selectedDriver.id}_${betType}_${Date.now()}`;
    const newBet = {
      id: betId,
      driverId: selectedDriver.id,
      driverName: selectedDriver.name,
      amount: betAmount,
      type: betType,
      odds: selectedDriver.odds,
      timestamp: new Date(),
      market: currentMarket.title
    };

    setUserBets(prev => ({ ...prev, [betId]: newBet }));
    setUserBalance(prev => prev - betAmount);
    setShowBettingModal(false);
    setBetAmount(0);
    setSelectedDriver(null);
  };

  const calculatePotentialPayout = (amount, odds) => {
    return Math.round(amount * odds * 100) / 100;
  };

  const getTimeRemaining = (endTime) => {
    const now = moment();
    const end = moment(endTime);
    const duration = moment.duration(end.diff(now));
    
    if (duration.asMilliseconds() <= 0) return "Market Closed";
    
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    const seconds = duration.seconds();
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <>
      <Head>
        <title>F1 Betting - Monaco</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <main style={{ 
        minHeight: "100vh", 
        backgroundColor: "#0a0a0a", 
        color: "#ffffff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #1a1a1a",
          backgroundColor: "#111111"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: "1200px",
            margin: "0 auto"
          }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "600" }}>F1 Betting</h1>
              <p style={{ margin: "4px 0 0 0", color: "#888", fontSize: "14px" }}>
                Predict the outcome of Formula 1 races
              </p>
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "16px"
            }}>
              <div style={{
                backgroundColor: "#1a1a1a",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #333"
              }}>
                <span style={{ fontSize: "14px", color: "#888" }}>Balance: </span>
                <span style={{ fontSize: "16px", fontWeight: "600", color: "#00ff88" }}>
                  ${userBalance.toFixed(2)}
                </span>
              </div>
              <a href="/" style={{
                padding: "8px 16px",
                backgroundColor: "#333",
                color: "white",
                textDecoration: "none",
                borderRadius: "6px",
                fontSize: "14px"
              }}>
                ← Back to Live Timing
              </a>
            </div>
          </div>
        </div>

        {/* Market Selector */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #1a1a1a",
          backgroundColor: "#0f0f0f"
        }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap"
            }}>
              {mockBettingData.markets.map(market => (
                <button
                  key={market.id}
                  onClick={() => setSelectedMarket(market.id)}
                  style={{
                    padding: "12px 20px",
                    backgroundColor: selectedMarket === market.id ? "#00ff88" : "#1a1a1a",
                    color: selectedMarket === market.id ? "#000" : "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s"
                  }}
                >
                  {market.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Market Info */}
        <div style={{
          padding: "20px 24px",
          backgroundColor: "#111111"
        }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px"
            }}>
              <div>
                <h2 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "600" }}>
                  {currentMarket.title}
                </h2>
                <p style={{ margin: 0, color: "#888", fontSize: "14px" }}>
                  {currentMarket.description}
                </p>
              </div>
              <div style={{
                display: "flex",
                gap: "24px",
                alignItems: "center"
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Volume</div>
                  <div style={{ fontSize: "16px", fontWeight: "600" }}>
                    ${currentMarket.totalVolume.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>Time Left</div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#ff6b6b" }}>
                    {getTimeRemaining(currentMarket.endTime)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Betting Grid */}
        <div style={{
          padding: "24px",
          maxWidth: "1200px",
          margin: "0 auto"
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "16px"
          }}>
            {drivers.map(driver => (
              <div
                key={driver.id}
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "12px",
                  padding: "20px",
                  transition: "all 0.2s",
                  cursor: "pointer"
                }}
                onClick={() => {
                  setSelectedDriver(driver);
                  setShowBettingModal(true);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = driver.color;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#333";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px"
                }}>
                  <div>
                    <h3 style={{
                      margin: "0 0 4px 0",
                      fontSize: "16px",
                      fontWeight: "600"
                    }}>
                      {driver.name}
                    </h3>
                    <p style={{
                      margin: 0,
                      fontSize: "12px",
                      color: "#888"
                    }}>
                      {driver.team}
                    </p>
                  </div>
                  <div style={{
                    width: "12px",
                    height: "12px",
                    backgroundColor: driver.color,
                    borderRadius: "50%"
                  }} />
                </div>

                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px"
                }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>
                      Current Odds
                    </div>
                    <div style={{
                      fontSize: "24px",
                      fontWeight: "700",
                      color: "#00ff88"
                    }}>
                      {driver.odds}x
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>
                      Votes
                    </div>
                    <div style={{
                      fontSize: "16px",
                      fontWeight: "600"
                    }}>
                      {driver.votes.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: "#0a0a0a",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #333"
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "#888"
                  }}>
                    <span>Potential Payout ($100)</span>
                    <span>${calculatePotentialPayout(100, driver.odds)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Bets Dashboard */}
        {Object.keys(userBets).length > 0 && (
          <div style={{
            padding: "24px",
            backgroundColor: "#0f0f0f",
            borderTop: "1px solid #1a1a1a"
          }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "600" }}>
                Your Active Bets
              </h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "12px"
              }}>
                {Object.values(userBets).map(bet => (
                  <div
                    key={bet.id}
                    style={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      padding: "16px"
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px"
                    }}>
                      <span style={{ fontSize: "14px", fontWeight: "600" }}>
                        {bet.driverName}
                      </span>
                      <span style={{
                        fontSize: "12px",
                        padding: "2px 8px",
                        backgroundColor: bet.type === "YES" ? "#00ff88" : "#ff6b6b",
                        color: bet.type === "YES" ? "#000" : "#fff",
                        borderRadius: "4px"
                      }}>
                        {bet.type}
                      </span>
                    </div>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      color: "#888"
                    }}>
                      <span>Bet: ${bet.amount}</span>
                      <span>Odds: {bet.odds}x</span>
                      <span>Payout: ${calculatePotentialPayout(bet.amount, bet.odds)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Betting Modal */}
        {showBettingModal && selectedDriver && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "12px",
              padding: "24px",
              width: "400px",
              maxWidth: "90vw"
            }}>
              <h3 style={{
                margin: "0 0 16px 0",
                fontSize: "18px",
                fontWeight: "600"
              }}>
                Place Bet: {selectedDriver.name}
              </h3>

              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#888",
                  marginBottom: "8px"
                }}>
                  Bet Type
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setBetType("YES")}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: betType === "YES" ? "#00ff88" : "#333",
                      color: betType === "YES" ? "#000" : "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setBetType("NO")}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: betType === "NO" ? "#ff6b6b" : "#333",
                      color: betType === "NO" ? "#fff" : "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}
                  >
                    NO
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#888",
                  marginBottom: "8px"
                }}>
                  Bet Amount
                </label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  max={userBalance}
                  step="0.01"
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #333",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "14px"
                  }}
                />
                <div style={{
                  fontSize: "12px",
                  color: "#888",
                  marginTop: "4px"
                }}>
                  Available: ${userBalance.toFixed(2)}
                </div>
              </div>

              <div style={{
                backgroundColor: "#0a0a0a",
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "16px"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  color: "#888",
                  marginBottom: "4px"
                }}>
                  <span>Odds</span>
                  <span>{selectedDriver.odds}x</span>
                </div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "14px",
                  fontWeight: "600"
                }}>
                  <span>Potential Payout</span>
                  <span style={{ color: "#00ff88" }}>
                    ${calculatePotentialPayout(betAmount, selectedDriver.odds)}
                  </span>
                </div>
              </div>

              <div style={{
                display: "flex",
                gap: "12px"
              }}>
                <button
                  onClick={() => setShowBettingModal(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "#333",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePlaceBet}
                  disabled={betAmount <= 0 || betAmount > userBalance}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: betAmount > 0 && betAmount <= userBalance ? "#00ff88" : "#333",
                    color: betAmount > 0 && betAmount <= userBalance ? "#000" : "#666",
                    border: "none",
                    borderRadius: "6px",
                    cursor: betAmount > 0 && betAmount <= userBalance ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}
                >
                  Place Bet
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
