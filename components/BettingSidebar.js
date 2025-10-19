import { useState, useEffect, useRef } from "react";
import moment from "moment";

const BettingSidebar = ({ driverList, timingData, sessionInfo, voiceService }) => {
  const [userBets, setUserBets] = useState({});
  const [userBalance, setUserBalance] = useState(1000);
  const [showBettingModal, setShowBettingModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [betAmount, setBetAmount] = useState(0);
  const [betType, setBetType] = useState("YES");

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const sidebarRef = useRef(null);

  // Handle drag start
  const handleMouseDown = (e) => {
    if (e.target.closest('.betting-content')) return; // Don't drag if clicking on content
    
    setIsDragging(true);
    const rect = sidebarRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  };

  // Handle double-click to reset position
  const handleDoubleClick = (e) => {
    if (e.target.closest('.betting-content')) return;
    setPosition({ x: 20, y: 20 });
  };

  // Handle drag move
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep sidebar within viewport bounds
    const maxX = window.innerWidth - 320; // sidebar width
    const maxY = window.innerHeight - 400; // estimated sidebar height
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragOffset]);

  // Calculate odds based on current position and performance
  const calculateOdds = (driverNumber, timingData) => {
    if (!timingData?.Lines?.[driverNumber]) return 10.0;
    
    const driverData = timingData.Lines[driverNumber];
    const position = parseInt(driverData.Position) || 20;
    
    // Base odds on position (lower position = better odds)
    const baseOdds = Math.max(1.5, position * 0.8);
    
    // Adjust based on gap to leader
    if (driverData.GapToLeader) {
      const gapSeconds = parseFloat(driverData.GapToLeader.replace(/[^\d.]/g, '')) || 0;
      const gapMultiplier = Math.max(1, gapSeconds / 10);
      return Math.round(baseOdds * gapMultiplier * 100) / 100;
    }
    
    return Math.round(baseOdds * 100) / 100;
  };

  // Generate mock vote counts based on position
  const generateVoteCount = (position) => {
    const maxVotes = 2000;
    const positionWeight = Math.max(1, 21 - position); // Higher position = more votes
    return Math.floor((positionWeight / 20) * maxVotes * (0.8 + Math.random() * 0.4));
  };

  const handlePlaceBet = () => {
    if (betAmount <= 0 || betAmount > userBalance) return;
    
    const betId = `${selectedDriver.number}_${betType}_${Date.now()}`;
    const odds = calculateOdds(selectedDriver.number, timingData);
    
    const newBet = {
      id: betId,
      driverNumber: selectedDriver.number,
      driverName: selectedDriver.name,
      amount: betAmount,
      type: betType,
      odds: odds,
      timestamp: new Date(),
      market: "Race Winner"
    };

    setUserBets(prev => ({ ...prev, [betId]: newBet }));
    setUserBalance(prev => prev - betAmount);
    setShowBettingModal(false);
    setBetAmount(0);
    setSelectedDriver(null);

    // Voice announcement for betting decision
    if (voiceService && voiceService.isEnabled) {
      voiceService.announceBettingDecision(
        selectedDriver.name,
        betType,
        betAmount,
        odds
      );
    }
  };

  const calculatePotentialPayout = (amount, odds) => {
    return Math.round(amount * odds * 100) / 100;
  };

  if (!driverList || !timingData) {
    return (
      <div style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        width: "320px",
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: "12px",
        padding: "16px",
        zIndex: 1000,
        color: "#fff"
      }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600" }}>
          🎯 Live Betting
        </h3>
        <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
          Loading driver data...
        </p>
      </div>
    );
  }

  // Track previous positions for voice announcements
  const [previousPositions, setPreviousPositions] = useState({});

  const drivers = Object.entries(driverList).map(([number, driver]) => {
    const timingLine = timingData.Lines[number];
    const position = timingLine?.Position || "20";
    const odds = calculateOdds(number, timingData);
    const votes = generateVoteCount(parseInt(position));
    
    return {
      number,
      name: driver.Tla || driver.BroadcastName || `Driver ${number}`,
      fullName: driver.BroadcastName || driver.FullName || `Driver ${number}`,
      team: driver.TeamName || "Unknown Team",
      position: parseInt(position),
      odds,
      votes,
      color: driver.TeamColour ? `#${driver.TeamColour}` : "#666666"
    };
  }).sort((a, b) => a.position - b.position);

  // Check for position changes and announce them
  useEffect(() => {
    if (voiceService && voiceService.isEnabled && Object.keys(previousPositions).length > 0) {
      drivers.forEach(driver => {
        const prevPos = previousPositions[driver.number];
        if (prevPos && prevPos !== driver.position) {
          voiceService.announcePositionChange(driver.name, prevPos, driver.position);
        }
      });
    }
    
    // Update previous positions
    const newPreviousPositions = {};
    drivers.forEach(driver => {
      newPreviousPositions[driver.number] = driver.position;
    });
    setPreviousPositions(newPreviousPositions);
  }, [drivers, voiceService]);

  return (
    <>
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        .dragging {
          transform: rotate(1deg);
        }
      `}</style>
      
      {/* Draggable Betting Sidebar */}
      <div 
        ref={sidebarRef}
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: "320px",
          backgroundColor: "#1a1a1a",
          border: isDragging ? "2px solid #00ff88" : "1px solid #333",
          borderRadius: "12px",
          padding: "0",
          zIndex: 1000,
          color: "#fff",
          maxHeight: "80vh",
          overflowY: "auto",
          cursor: isDragging ? "grabbing" : "grab",
          boxShadow: isDragging ? "0 8px 32px rgba(0, 255, 136, 0.3)" : "0 4px 16px rgba(0, 0, 0, 0.3)",
          transition: isDragging ? "none" : "box-shadow 0.2s ease",
          transform: isDragging ? "rotate(1deg)" : "rotate(0deg)"
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        {/* Drag Handle */}
        <div style={{
          padding: "8px 16px",
          backgroundColor: "#0a0a0a",
          borderBottom: "1px solid #333",
          borderRadius: "12px 12px 0 0",
          cursor: "grab",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          userSelect: "none"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <div style={{
              width: "12px",
              height: "12px",
              backgroundColor: "#00ff88",
              borderRadius: "50%",
              animation: "pulse 2s infinite"
            }} />
            <span style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "#00ff88"
            }}>
              🎯 Live Betting
            </span>
          </div>
          <div style={{
            display: "flex",
            gap: "8px",
            alignItems: "center"
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#888",
                cursor: "pointer",
                fontSize: "12px",
                padding: "2px 4px",
                borderRadius: "2px",
                transition: "color 0.2s"
              }}
              onMouseEnter={(e) => e.target.style.color = "#fff"}
              onMouseLeave={(e) => e.target.style.color = "#888"}
            >
              {isMinimized ? "⤢" : "⤡"}
            </button>
            <div style={{
              display: "flex",
              gap: "2px"
            }}>
              <div style={{
                width: "3px",
                height: "3px",
                backgroundColor: "#666",
                borderRadius: "50%"
              }} />
              <div style={{
                width: "3px",
                height: "3px",
                backgroundColor: "#666",
                borderRadius: "50%"
              }} />
              <div style={{
                width: "3px",
                height: "3px",
                backgroundColor: "#666",
                borderRadius: "50%"
              }} />
            </div>
          </div>
        </div>

        {/* Betting Content */}
        {!isMinimized && (
          <div className="betting-content" style={{
            padding: "16px"
          }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px"
          }}>
            <div style={{
              fontSize: "12px",
              color: "#888",
              fontWeight: "600"
            }}>
              Balance
            </div>
            <div style={{
              fontSize: "14px",
              color: "#00ff88",
              fontWeight: "700"
            }}>
              ${userBalance.toFixed(2)}
            </div>
          </div>

        <div style={{
          fontSize: "12px",
          color: "#888",
          marginBottom: "12px"
        }}>
          Race Winner Market
        </div>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "16px"
        }}>
          {drivers.slice(0, 8).map(driver => (
            <div
              key={driver.number}
              onClick={() => {
                setSelectedDriver(driver);
                setShowBettingModal(true);
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                backgroundColor: "#0a0a0a",
                border: "1px solid #333",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = driver.color;
                e.currentTarget.style.backgroundColor = "#111111";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#333";
                e.currentTarget.style.backgroundColor = "#0a0a0a";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  backgroundColor: driver.color,
                  borderRadius: "50%"
                }} />
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "600" }}>
                    P{driver.position} {driver.name}
                  </div>
                  <div style={{ fontSize: "10px", color: "#888" }}>
                    {driver.votes.toLocaleString()} votes
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "#00ff88"
              }}>
                {driver.odds}x
              </div>
            </div>
          ))}
        </div>

        {/* Active Bets */}
        {Object.keys(userBets).length > 0 && (
          <div style={{
            borderTop: "1px solid #333",
            paddingTop: "12px"
          }}>
            <div style={{
              fontSize: "12px",
              color: "#888",
              marginBottom: "8px"
            }}>
              Your Bets ({Object.keys(userBets).length})
            </div>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              maxHeight: "120px",
              overflowY: "auto"
            }}>
              {Object.values(userBets).slice(0, 3).map(bet => (
                <div
                  key={bet.id}
                  style={{
                    padding: "6px 8px",
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #333",
                    borderRadius: "4px",
                    fontSize: "10px"
                  }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "2px"
                  }}>
                    <span>{bet.driverName}</span>
                        <span style={{
                          padding: "1px 4px",
                          backgroundColor: bet.type === "YES" ? "#00ff88" : "#ff6b6b",
                          color: bet.type === "YES" ? "#000" : "#fff",
                          borderRadius: "2px",
                          fontSize: "9px"
                        }}>
                          {bet.type}
                        </span>
                  </div>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#888"
                  }}>
                    <span>${bet.amount}</span>
                    <span>{bet.odds}x</span>
                    <span style={{ color: "#00ff88" }}>
                      ${calculatePotentialPayout(bet.amount, bet.odds)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          </div>
        )}
      </div>

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
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "12px",
            padding: "20px",
            width: "350px",
            maxWidth: "90vw"
          }}>
            <h3 style={{
              margin: "0 0 12px 0",
              fontSize: "16px",
              fontWeight: "600"
            }}>
              Bet on {selectedDriver.fullName}
            </h3>

            <div style={{ marginBottom: "12px" }}>
              <label style={{
                display: "block",
                fontSize: "11px",
                color: "#888",
                marginBottom: "6px"
              }}>
                Bet Type
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => setBetType("YES")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    backgroundColor: betType === "YES" ? "#00ff88" : "#333",
                    color: betType === "YES" ? "#000" : "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}
                >
                  YES
                </button>
                <button
                  onClick={() => setBetType("NO")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    backgroundColor: betType === "NO" ? "#ff6b6b" : "#333",
                    color: betType === "NO" ? "#fff" : "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}
                >
                  NO
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{
                display: "block",
                fontSize: "11px",
                color: "#888",
                marginBottom: "6px"
              }}>
                Amount
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
                  padding: "8px",
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  color: "#fff",
                  fontSize: "12px"
                }}
              />
              <div style={{
                fontSize: "10px",
                color: "#888",
                marginTop: "2px"
              }}>
                Available: ${userBalance.toFixed(2)}
              </div>
            </div>

            <div style={{
              backgroundColor: "#0a0a0a",
              padding: "8px",
              borderRadius: "4px",
              marginBottom: "12px"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#888",
                marginBottom: "2px"
              }}>
                <span>Odds</span>
                <span>{selectedDriver.odds}x</span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                fontWeight: "600"
              }}>
                <span>Payout</span>
                <span style={{ color: "#00ff88" }}>
                  ${calculatePotentialPayout(betAmount, selectedDriver.odds)}
                </span>
              </div>
            </div>

            <div style={{
              display: "flex",
              gap: "8px"
            }}>
              <button
                onClick={() => setShowBettingModal(false)}
                style={{
                  flex: 1,
                  padding: "8px",
                  backgroundColor: "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePlaceBet}
                disabled={betAmount <= 0 || betAmount > userBalance}
                style={{
                  flex: 1,
                  padding: "8px",
                  backgroundColor: betAmount > 0 && betAmount <= userBalance ? "#00ff88" : "#333",
                  color: betAmount > 0 && betAmount <= userBalance ? "#000" : "#666",
                  border: "none",
                  borderRadius: "4px",
                  cursor: betAmount > 0 && betAmount <= userBalance ? "pointer" : "not-allowed",
                  fontSize: "12px",
                  fontWeight: "600"
                }}
              >
                Place Bet
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BettingSidebar;
