# 🎯 HPC Strategy System - Complete Guide

## 🚀 **How It Works**

### **System Overview**

```
User Interface (Browser)
       ↓
Strategy Focus Selector ← Select Driver
       ↓
Strategy Command Center → Sends Request
       ↓
Next.js API Route (/api/strategy/driver)
       ↓
Spawns Python Process
       ↓
Monte Carlo Engine (strategy_engine.py)
       ↓
10,000 Simulations → Calculate Optimal Strategies
       ↓
Return JSON Results
       ↓
Display in Sidebar with Confidence Scores
```

---

## 📋 **Step-by-Step Flow**

### **1. Driver Selection** 🎯

**Location**: Top of track map

- **Dropdown**: Shows all drivers sorted by position
- **Quick Buttons**: P1, P2, P3 for fast access
- **Auto-select**: Automatically selects leader on load

```javascript
// When you select a driver
setFocusDriver(driverNumber); // e.g., "33" for Verstappen
```

---

### **2. Strategy Calculation Request** 📡

**Component**: `StrategyCommandCenter.js`

When a driver is selected, the component:

```javascript
// Makes API request
fetch(`/api/strategy/driver?sessionKey=9161&driverNumber=33`)
```

**What it sends**:
- `sessionKey`: Session identifier (e.g., 9161 for Singapore 2023 P1)
- `driverNumber`: Driver racing number (e.g., 33 for VER)

---

### **3. API Handler** ⚙️

**Location**: `pages/api/strategy/driver.js`

The API route:
1. Receives the request
2. Spawns Python process
3. Passes parameters to Python script
4. Waits for results
5. Returns JSON to frontend

```javascript
const pythonProcess = spawn('python', [
  'montecarlo/strategy_engine.py', 
  driverNumber,  // e.g., "33"
  sessionKey     // e.g., "9161"
]);
```

---

### **4. Monte Carlo Engine** 🎲

**Location**: `montecarlo/strategy_engine.py`

The Python script runs **10,000 simulations** for each strategy:

#### **Strategy Options Evaluated**:

1. **PIT NOW**
   - Simulates immediate pit stop
   - Factors: pit loss time (22s), traffic, tire advantage
   - Calculates position changes

2. **EXTEND STINT**
   - Simulates staying out longer
   - Factors: tire degradation, traffic avoidance
   - Risk vs reward analysis

3. **PUSH MODE**
   - Simulates aggressive driving
   - Factors: overtake chances, tire wear risk
   - Higher reward, higher risk

4. **FUEL SAVE MODE**
   - Simulates conservative driving
   - Factors: maintaining position, fuel conservation
   - Lower risk, steady state

#### **For Each Strategy**:
```python
for _ in range(10000):  # 10,000 simulations
    # Simulate race outcome
    - Apply random factors (traffic, tire wear, etc.)
    - Calculate final position
    - Record result

# Calculate statistics
- Average position
- Confidence score (based on consistency)
- Expected value (position gain/loss)
```

---

### **5. Pit Window Calculation** 🔧

The engine also calculates:

```python
# Test pit stops on different laps
for pit_lap in range(current_lap, current_lap + 15):
    # Run 1000 quick simulations per lap
    - Calculate expected position
    - Factor in traffic
    - Consider tire advantage

# Find optimal lap
- Best average position
- Safe window (within 10% of optimal)
- Laps to avoid (worst performance)
```

**Output**:
```json
{
  "optimal": 18,
  "min": 16,
  "max": 21,
  "avoid": [14, 15],
  "reason": "Clear track ahead on lap 18"
}
```

---

### **6. Risk Assessment** 🎲

Multi-dimensional risk calculation:

```python
risks = {
    "Safety Car": 5-20%,
    "Traffic": 8-25%,
    "Tire Failure": 3-15%,
    "Weather": 2-10%
}

total_risk = average(all_risks)

if total_risk < 15%: "LOW"
elif total_risk < 25%: "MEDIUM"
else: "HIGH"
```

---

### **7. Results Returned** 📊

The Python script outputs JSON:

```json
{
  "topDecision": {
    "action": "PIT NOW",
    "confidence": 89,
    "expectedOutcome": "Expected: P3 (+1.2 positions)"
  },
  "alternatives": [
    {
      "action": "EXTEND STINT",
      "confidence": 73,
      "expectedOutcome": "Expected: P3 (maintain)"
    },
    {
      "action": "PUSH MODE",
      "confidence": 68,
      "expectedOutcome": "Expected: P2 (+2.1 positions)"
    }
  ],
  "pitWindow": {
    "optimal": 18,
    "min": 16,
    "max": 21,
    "avoid": [14, 15],
    "reason": "Clear track ahead on lap 18"
  },
  "risk": {
    "level": "LOW",
    "score": 12,
    "factors": [
      {"name": "Safety Car", "value": 15},
      {"name": "Traffic", "value": 12},
      {"name": "Tire Failure", "value": 8},
      {"name": "Weather", "value": 5}
    ]
  },
  "simulations": 10000
}
```

---

### **8. Display in UI** 🖥️

**Component**: `StrategyCommandCenter.js`

The sidebar displays:

```
┌─────────────────────────────┐
│ 🎯 VER Strategy             │
├─────────────────────────────┤
│ Max Verstappen (Red Bull)   │
│ Position: P1                │
├─────────────────────────────┤
│ ⚡ RECOMMENDED ACTION        │
│ PIT NOW                     │
│ Confidence: ████████░ 89%   │
│ Expected: P1 (+1.2 pos)     │
├─────────────────────────────┤
│ Alternative Strategies      │
│ #2 EXTEND STINT       73%   │
│ #3 PUSH MODE          68%   │
├─────────────────────────────┤
│ 🔧 Optimal Pit Window       │
│ LAP 18                      │
│ ✅ Safe: L16-L21            │
│ ⚠️ Avoid: L14, L15          │
│ Clear track ahead           │
├─────────────────────────────┤
│ 🎲 Risk Assessment          │
│ LOW RISK                    │
│ Safety Car:      15%        │
│ Traffic:         12%        │
│ Tire Failure:     8%        │
│ Weather:          5%        │
└─────────────────────────────┘
```

---

## 🛠️ **Setup Instructions**

### **1. Install Python Dependencies**

```bash
cd nmc2_hacktx/montecarlo
pip install -r requirements.txt
```

**Required**:
- `numpy` - For Monte Carlo simulations

### **2. Verify Python Installation**

```bash
python --version  # Should be Python 3.7+
python -c "import numpy; print('NumPy OK')"
```

### **3. Test Strategy Engine**

```bash
cd nmc2_hacktx
python montecarlo/strategy_engine.py 33 9161
```

**Expected output**: JSON with strategies

### **4. Start Development Server**

```bash
npm run dev
```

### **5. Load a Replay Session**

1. Go to http://localhost:3000
2. Click "2023 Singapore Grand Prix - Practice 1"
3. Wait for data to load
4. Press ▶ Play

### **6. Select a Driver**

1. Look at the **top of the track map**
2. Click the dropdown to select a driver
3. Or click **P1**, **P2**, **P3** quick buttons

### **7. View Strategies**

The **Strategy Command Center** sidebar will appear on the left showing:
- ⚡ Recommended action
- 📊 Alternative strategies
- 🔧 Optimal pit window
- 🎲 Risk assessment

---

## 🐛 **Troubleshooting**

### **Problem: Sidebar is Blank**

**Check console for errors**:
```javascript
[Strategy] Effect triggered: {focusDriver: "33", ...}
[Strategy] Fetching strategies for driver 33...
[Strategy] ✓ Strategies loaded successfully
```

**Common Issues**:

1. **No session_key**
   ```
   [Strategy] No session_key available
   ```
   **Fix**: Make sure session has loaded. Check `SessionInfo.session_key` exists.

2. **Python not found**
   ```
   Failed to start Python process
   ```
   **Fix**: Install Python and add to PATH

3. **NumPy not installed**
   ```
   ModuleNotFoundError: No module named 'numpy'
   ```
   **Fix**: `pip install numpy`

4. **API timeout**
   ```
   API error: 500
   ```
   **Fix**: Check Python script runs: `python montecarlo/strategy_engine.py 33 9161`

---

### **Problem: Driver Selector Not Showing**

**Check**:
1. Is replay mode active? (not live mode)
2. Has session data loaded? (DriverList exists)
3. Check console: `[Strategy] Effect triggered`

**Fix**: Make sure you're in replay mode and session has loaded.

---

### **Problem: Slow Strategy Updates**

**Reasons**:
- Running 10,000 simulations takes ~200ms
- Python process spawn overhead
- First request is always slower

**Optimization**:
- Results are cached for 15 seconds
- Reduce `SIMULATIONS` in `strategy_engine.py` for faster testing

---

## 🔬 **How Monte Carlo Works**

### **The Algorithm**

Monte Carlo simulation uses **random sampling** to predict outcomes:

```python
# Simplified example
def simulate_pit_stop():
    positions = []
    
    for _ in range(10000):
        # Random factors
        pit_loss = random.uniform(21, 23)  # Pit stop time
        traffic = random.uniform(0, 3)      # Traffic penalty
        tire_boost = random.uniform(0, 2)   # Fresh tire advantage
        
        # Calculate result
        position_change = -pit_loss/10 + traffic - tire_boost
        positions.append(current_position + position_change)
    
    # Statistics
    avg_position = mean(positions)
    confidence = 100 - (std_dev(positions) * 10)
    
    return {
        "expected": avg_position,
        "confidence": confidence
    }
```

### **Why 10,000 Simulations?**

- **Fewer** (<1,000): Less accurate, high variance
- **10,000**: Good balance of accuracy and speed
- **More** (>100,000): Marginal gains, much slower

### **Confidence Calculation**

```python
confidence = max(60, min(95, 100 - (std_deviation * 10)))
```

- **Low std dev** (consistent results) → **High confidence**
- **High std dev** (scattered results) → **Low confidence**

---

## 🎨 **Customization**

### **Adjust Simulation Count**

Edit `montecarlo/strategy_engine.py`:
```python
SIMULATIONS = 5000  # Faster, less accurate
SIMULATIONS = 20000  # Slower, more accurate
```

### **Change Update Frequency**

Edit `components/StrategyCommandCenter.js`:
```javascript
const interval = setInterval(fetchStrategies, 10000); // 10 seconds
```

### **Modify Strategy Options**

Add new strategies in `strategy_engine.py`:
```python
strategies = {
    'pit_now': self._simulate_pit_now(),
    'extend_stint': self._simulate_stint_extension(),
    'push_mode': self._simulate_push_strategy(),
    'your_strategy': self._simulate_your_strategy(),  # NEW!
}
```

---

## 📊 **Performance**

| Metric | Value |
|--------|-------|
| Simulations | 10,000 per strategy |
| Strategies Evaluated | 4 (pit, extend, push, fuel) |
| Total Simulations | 40,000 |
| Execution Time | ~200ms |
| Memory Usage | <50MB |
| API Response | ~300-500ms (including overhead) |
| Update Frequency | Every 15 seconds |

---

## 🎯 **Key Features**

✅ **Real-time HPC Calculations** - 40,000 simulations per request
✅ **Driver-Specific** - Personalized strategies per driver
✅ **Confidence Scores** - Statistical confidence (60-95%)
✅ **Risk Assessment** - Multi-factor risk analysis
✅ **Pit Windows** - Optimal lap ranges with reasons
✅ **Auto-refresh** - Updates every 15 seconds
✅ **Draggable UI** - Position saved in localStorage
✅ **Quick Selection** - P1/P2/P3 buttons for fast access

---

## 🔮 **Future Enhancements**

- [ ] Real-time data integration (use actual tire temps, fuel)
- [ ] Historical learning (ML model trained on past races)
- [ ] Team-wide strategy (compare teammates)
- [ ] Weather prediction integration
- [ ] Tire compound optimization
- [ ] Fuel load calculations
- [ ] DRS zone analysis
- [ ] Safety car probability modeling

---

## 📚 **API Documentation**

### **Endpoint**

```
GET /api/strategy/driver?sessionKey={session}&driverNumber={driver}
```

### **Parameters**

| Parameter | Type | Required | Example | Description |
|-----------|------|----------|---------|-------------|
| sessionKey | string | Yes | "9161" | OpenF1 session identifier |
| driverNumber | string | Yes | "33" | Driver racing number |

### **Response**

```typescript
{
  driverNumber: string,
  sessionKey: string,
  timestamp: string,  // ISO 8601
  strategies: {
    topDecision: {
      action: string,           // e.g., "PIT NOW"
      confidence: number,       // 60-95
      expectedOutcome: string   // Human-readable result
    },
    alternatives: Array<{
      action: string,
      confidence: number,
      expectedOutcome: string
    }>,
    pitWindow: {
      optimal: number,        // Lap number
      min: number,           // Safe window start
      max: number,           // Safe window end
      avoid: number[],       // Laps to avoid
      reason: string         // Why this is optimal
    },
    risk: {
      level: "LOW" | "MEDIUM" | "HIGH",
      score: number,         // 0-100
      factors: Array<{
        name: string,
        value: number        // Percentage
      }>
    },
    simulations: number      // Usually 10,000
  }
}
```

---

**🏁 Happy Racing! 🏁**

