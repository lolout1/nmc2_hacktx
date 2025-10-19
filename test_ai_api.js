/**
 * Test script for AI API endpoints
 * Run with: node test_ai_api.js
 */

const testData = {
  sessionKey: '9161',
  driverNumber: 1,
  raceData: {
    sessionData: {
      session_name: 'Qualifying',
      circuit_short_name: 'Singapore',
      country_name: 'Singapore'
    },
    driverList: {
      1: { BroadcastName: 'M VERSTAPPEN' }
    },
    timingData: {
      Lines: {
        1: {
          Position: 1,
          LastLapTime: { Value: '91.743' },
          BestLapTime: { Value: '91.743' },
          GapToLeader: '0.000',
          IntervalToPositionAhead: { Value: null },
          InPit: false
        }
      }
    },
    weatherData: {
      AirTemp: 29.4,
      TrackTemp: 33.5,
      Humidity: 78,
      WindSpeed: 1.2
    }
  }
};

async function testFallbackAI() {
  console.log('🧪 Testing Fallback AI API...\n');
  
  try {
    // Test summary
    console.log('1. Testing Summary Generation...');
    const summaryResponse = await fetch('http://localhost:3000/api/ai/fallback-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'summary',
        ...testData
      })
    });
    
    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      console.log('✅ Summary API working!');
      console.log('Source:', summaryData.source);
      console.log('Summary preview:', summaryData.summary.substring(0, 100) + '...\n');
    } else {
      console.log('❌ Summary API failed:', summaryResponse.status);
      const error = await summaryResponse.json();
      console.log('Error:', error);
    }
    
    // Test question
    console.log('2. Testing Question Answering...');
    const questionResponse = await fetch('http://localhost:3000/api/ai/fallback-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'question',
        question: 'Should we pit now?',
        ...testData
      })
    });
    
    if (questionResponse.ok) {
      const questionData = await questionResponse.json();
      console.log('✅ Question API working!');
      console.log('Source:', questionData.source);
      console.log('Answer preview:', questionData.answer.substring(0, 100) + '...\n');
    } else {
      console.log('❌ Question API failed:', questionResponse.status);
      const error = await questionResponse.json();
      console.log('Error:', error);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

async function testPrimaryAI() {
  console.log('🧪 Testing Primary AI API...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/ai/openai-rag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'summary',
        ...testData
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Primary AI API working!');
      console.log('Summary preview:', data.summary.substring(0, 100) + '...\n');
    } else {
      console.log('❌ Primary AI API failed:', response.status);
      const error = await response.json();
      console.log('Error:', error);
      console.log('This is expected if Python dependencies are not installed.\n');
    }
    
  } catch (error) {
    console.log('❌ Primary AI test failed:', error.message);
    console.log('This is expected if Python dependencies are not installed.\n');
  }
}

async function runTests() {
  console.log('🚀 AI API Test Suite\n');
  console.log('Make sure the development server is running: npm run dev\n');
  
  await testFallbackAI();
  await testPrimaryAI();
  
  console.log('🎯 Test Results Summary:');
  console.log('- Fallback AI should work with or without OpenAI API key');
  console.log('- Primary AI requires Python dependencies (pandas, openai)');
  console.log('- If both fail, check that the dev server is running');
  console.log('\n✅ Tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testFallbackAI, testPrimaryAI };
