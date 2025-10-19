# ⚡ Quick Start - HPC Strategy System

## 🎯 **TL;DR - Get It Working in 3 Minutes**

### **1. Install Python Dependencies** (30 seconds)
```bash
cd nmc2_hacktx/montecarlo
pip install numpy
```

### **2. Delete Old Cache** (10 seconds)
```bash
# Windows
rmdir /s /q .openf1_cache

# Linux/Mac
rm -rf .openf1_cache
```

### **3. Start Server** (10 seconds)
```bash
cd nmc2_hacktx
npm run dev
```

### **4. Load Session** (1-2 minutes first time)
1. Open http://localhost:3000
2. Click **"2023 Singapore Grand Prix - Practice 1"**
3. Wait for cache to build (shows progress in terminal)
4. Press **▶ Play**

### **5. See Strategies** (instantly)
1. Look at **top of track map** - you'll see driver selector
2. **Click P1, P2, or P3** button (or use dropdown)
3. **Strategy sidebar appears on left** with recommendations

---

## 🎨 **What You'll See**

```
┌─────────────────────────────────────────┐
│  TRACK                                  │
│  [🎯 VER ▼] [P1] [P2] [P3] [Compare]  │  ← SELECT HERE!
│                                         │
│       🏎️ (cars on track)               │
└─────────────────────────────────────────┘

Left Sidebar:
┌──────────────────────┐
│ 🎯 VER Strategy      │
│ Max Verstappen (RBR) │
│ P1                   │
├──────────────────────┤
│ ⚡ PIT NOW           │
│ Confidence: 89%      │
│ Expected: P1 (+1.2)  │
├──────────────────────┤
│ #2 EXTEND STINT 73%  │
│ #3 PUSH MODE    68%  │
├──────────────────────┤
│ 🔧 Pit: Lap 18       │
│ 🎲 Risk: LOW         │
└──────────────────────┘
```

---

## 🐛 **Troubleshooting**

### **Sidebar is Blank?**

**Open browser console (F12)**:

✅ **Good** - Should see:
```
[Strategy] Effect triggered: {focusDriver: "33", ...}
[Strategy] Fetching strategies for driver 33...
[Strategy] ✓ Strategies loaded successfully
```

❌ **Bad** - If you see:
```
[Strategy] No session_key available
```
**Fix**: Wait for session to fully load. Should see `session_key: 9161` in logs.

❌ **Bad** - If you see:
```
Failed to start Python process
```
**Fix**: Install Python: `python --version` (need 3.7+)

❌ **Bad** - If you see:
```
ModuleNotFoundError: No module named 'numpy'
```
**Fix**: `pip install numpy`

---

### **Python Not Working?**

```bash
# Test it manually
cd nmc2_hacktx
python montecarlo/strategy_engine.py 33 9161
```

Should output JSON like:
```json
{
  "topDecision": {
    "action": "PIT NOW",
    "confidence": 89,
    ...
  }
}
```

---

### **Driver Selector Not Showing?**

1. **Check you're in replay mode** (not live)
2. **Make sure session loaded** (see timing data)
3. **Look at top of track** (selector is centered above map)

---

## 🎮 **How to Use**

### **Select Driver**

**3 Ways**:
1. **Quick Buttons**: Click P1, P2, or P3
2. **Dropdown**: Select any driver from list
3. **Auto**: Leader is selected automatically

### **View Strategies**

Sidebar shows:
- ⚡ **Top Recommendation** - Best action with confidence
- 📊 **Alternatives** - Other options ranked
- 🔧 **Pit Window** - Optimal lap to pit
- 🎲 **Risk Level** - LOW/MEDIUM/HIGH

### **Compare Drivers** (Coming Soon)

Click **Compare** button to see multiple drivers side-by-side

---

## 📊 **What the Numbers Mean**

| Display | Meaning |
|---------|---------|
| **89% Confidence** | 89% of simulations agreed |
| **P1 (+1.2 positions)** | Expected to gain 1.2 positions |
| **Lap 18** | Best lap to pit |
| **L16-L21** | Safe pit window |
| **Avoid L14, L15** | Heavy traffic, bad pit timing |
| **LOW RISK** | <15% risk factors |

---

## 🔄 **How Often Does It Update?**

- **Initial Load**: ~300-500ms
- **Refresh**: Every 15 seconds automatically
- **Simulations**: 10,000 per strategy
- **Total**: 40,000 simulations per driver

---

## 💡 **Pro Tips**

1. **Drag the sidebar** - Position it where you like (saves automatically)
2. **Watch multiple drivers** - Select different drivers to compare strategies
3. **Check console logs** - See detailed simulation results
4. **Pit window timing** - Green = safe, Red = avoid
5. **Confidence matters** - >80% is very reliable, <70% is uncertain

---

## 🎯 **Key Features**

✅ **Driver selector** at top of track
✅ **Quick P1/P2/P3 buttons** for fast selection
✅ **Auto-select leader** on first load
✅ **Real-time HPC** calculations (10K simulations)
✅ **Confidence scores** (60-95%)
✅ **Risk assessment** (multi-factor)
✅ **Pit windows** (optimal + safe range)
✅ **Draggable sidebar** (position persists)
✅ **Auto-refresh** (every 15s)

---

## 📝 **Console Commands**

Open browser console (F12) and try:

```javascript
// See what driver is selected
console.log(focusDriver);

// See session info
console.log(SessionInfo);

// Check if strategies loaded
console.log(strategies);
```

---

## 🚀 **Next Steps**

1. ✅ **Install** - Done above
2. ✅ **Run** - Server started
3. ✅ **Test** - Load Singapore session
4. 📖 **Learn** - Read `STRATEGY_GUIDE.md` for deep dive
5. 🎨 **Customize** - Modify Python algorithms
6. 🏁 **Race** - Use for strategy decisions!

---

**Need more details?** See `STRATEGY_GUIDE.md`

**Found a bug?** Check console (F12) and read troubleshooting section

**Want to modify?** Edit `montecarlo/strategy_engine.py` for algorithms

---

**🏁 You're ready to race with HPC-powered strategies! 🏁**

