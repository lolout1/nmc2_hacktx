# 🔍 Debugging AI Assistant

## **Current Status**
The AI modal opens but doesn't generate responses when clicking "Refresh" or "Ask AI".

## **What I've Added**

### **1. Enhanced Server-Side Logging**
The `/api/ai/fallback-ai` endpoint now logs:
- ✅ When request is received
- ✅ Action type (summary/question)
- ✅ Driver number and session
- ✅ Race data keys
- ✅ API key status
- ✅ Response generation status

### **2. Enhanced Client-Side Logging**
The `OpenAIAssistant.js` component logs:
- ✅ When fetching summary
- ✅ When asking question
- ✅ When answer received
- ✅ Error details

## **🧪 Debugging Steps**

### **Step 1: Check if API is Being Called**

Open browser DevTools (F12) → Console tab

**When you click "Refresh", you should see:**
```
[AI] Fetching summary for driver 1 session 9161
```

**If you DON'T see this:**
- The frontend function isn't being called
- Check if button click handler is working

**If you DO see this:**
- API is being called
- Check server terminal for response

---

### **Step 2: Check Server Terminal**

**In your `npm run dev` terminal, you should see:**
```
[Fallback AI] ===== RECEIVED REQUEST =====
[Fallback AI] Action: summary
[Fallback AI] Driver: #1
[Fallback AI] Session: 9161
[Fallback AI] Race data keys: [ 'sessionData', 'timingData', 'driverList', ... ]
[Fallback AI] API key status: Found (sk-proj-WuAnUG...) OR NOT FOUND
[Fallback AI] ✅ Generated rule-based summary (XXX chars)
```

**If you DON'T see any logs:**
- API endpoint not being reached
- Check network tab for failed request
- Check for CORS errors

**If you see error logs:**
- Check the error message
- Likely data format issue

---

### **Step 3: Check Network Tab**

Open DevTools → Network tab

1. Click "Refresh" button
2. Look for `/api/ai/fallback-ai` request
3. Check:
   - Status code (should be 200)
   - Response preview
   - Request payload

**Common Issues:**
- ❌ 404: API route not found
- ❌ 500: Server error (check terminal)
- ❌ 400: Bad request (missing data)
- ✅ 200: Success (check response)

---

### **Step 4: Check Response Format**

**In Network tab → Response preview, should see:**
```json
{
  "status": "success",
  "type": "summary",
  "summary": "**STRATEGIC ANALYSIS**\n\nSituation: ...",
  "source": "rule-based" or "openai-fallback"
}
```

**If response is correct but not showing:**
- Frontend not processing response
- Check browser console for errors

---

### **Step 5: Manual API Test**

Test the API directly:

```javascript
// Run this in browser console
fetch('/api/ai/fallback-ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'summary',
    sessionKey: '9161',
    driverNumber: 1,
    raceData: {
      sessionData: { session_name: 'Test' },
      driverList: { 1: { BroadcastName: 'Test Driver' } }
    }
  })
}).then(r => r.json()).then(console.log);
```

**Expected output:**
```json
{
  "status": "success",
  "summary": "...",
  "source": "rule-based"
}
```

---

## **🔍 Most Likely Issues**

### **Issue 1: API Not Being Called**
**Symptoms:** No console logs in browser or server

**Check:**
1. Is modal actually opening?
2. Is `sessionKey` defined? (Check: `console.log(sessionKey)`)
3. Is `driverNumber` defined?
4. Is button click handler attached?

**Fix:** Ensure component props are passed correctly

---

### **Issue 2: API Called But No Response**
**Symptoms:** Browser shows fetch log, but no response

**Check server terminal for:**
- Error logs
- "Generated summary" log

**Common causes:**
- `raceData` is null or malformed
- `buildRaceContext` failing
- `generateSummary` failing

**Fix:** Check data format being sent

---

### **Issue 3: Response Not Displayed**
**Symptoms:** API returns 200, but modal shows "No summary available"

**Check:**
1. Response has `summary` field
2. `setSummary()` is being called
3. No errors in console

**Fix:** Check frontend response handling

---

## **✅ Quick Fixes to Try**

### **Fix 1: Restart Dev Server**
```bash
# Stop server (Ctrl+C)
npm run dev
```

### **Fix 2: Check .env File**
```bash
# In nmc2_hacktx directory
cat .env
```
Should contain:
```
OPENAI_API_KEY=sk-proj-...
```

### **Fix 3: Clear Browser Cache**
```
Ctrl+Shift+Delete → Clear cache → Reload
```

### **Fix 4: Check Session is Loaded**
Make sure you've loaded Singapore GP 2023 (session 9161) before opening AI modal

---

## **📊 Expected Flow**

```
User clicks "Refresh"
    ↓
Browser Console: "[AI] Fetching summary..."
    ↓
Server Terminal: "[Fallback AI] RECEIVED REQUEST"
    ↓
Server Terminal: "[Fallback AI] Generated summary"
    ↓
Browser Console: "[AI] Summary received"
    ↓
Modal displays summary
```

---

## **🚨 If Still Not Working**

**Please provide:**
1. Browser console logs (F12 → Console)
2. Server terminal logs (where `npm run dev` is running)
3. Network tab screenshot (DevTools → Network → `/api/ai/fallback-ai`)

This will help me identify exactly where it's failing!

