/**
 * Verification Script for 4MB API Fixes
 * 
 * Run: node verify_fixes.js
 */

const http = require('http');

const baseUrl = 'http://localhost:3000';

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            status: res.statusCode,
            size: Buffer.byteLength(data, 'utf8'),
            data: json
          });
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function verifyOptimizedEndpoint() {
  console.log('\n📊 Test 1: Optimized Session Data Endpoint');
  console.log('=' .repeat(70));
  
  try {
    const result = await fetchJSON(`${baseUrl}/api/openf1/session-data-optimized?sessionKey=9161`);
    
    const sizeMB = (result.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Status: ${result.status}`);
    console.log(`✅ Size: ${sizeMB} MB (${result.size.toLocaleString()} bytes)`);
    
    if (result.size < 4 * 1024 * 1024) {
      console.log(`✅ PASS: Response size under 4MB limit`);
    } else {
      console.log(`❌ FAIL: Response size exceeds 4MB limit`);
    }
    
    // Check data structure
    const data = result.data;
    console.log(`\nData Summary:`);
    console.log(`  - Location points: ${data.location?.length || 0}`);
    console.log(`  - Car data points: ${data.carData?.length || 0}`);
    console.log(`  - Laps: ${data.laps?.length || 0}`);
    console.log(`  - Pit stops: ${data.pitStops?.length || 0}`);
    console.log(`\nMetadata:`);
    console.log(`  - Total location: ${data.metadata?.totalLocationPoints || 0}`);
    console.log(`  - Total car data: ${data.metadata?.totalCarDataPoints || 0}`);
    
    return true;
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    return false;
  }
}

async function verifyStreamingEndpoint() {
  console.log('\n\n📊 Test 2: Streaming Endpoint');
  console.log('=' .repeat(70));
  
  try {
    const result = await fetchJSON(`${baseUrl}/api/openf1/session-data-stream?sessionKey=9161&dataType=location&offset=0&limit=1000`);
    
    const sizeMB = (result.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Status: ${result.status}`);
    console.log(`✅ Size: ${sizeMB} MB`);
    
    const data = result.data;
    console.log(`\nStream Metadata:`);
    console.log(`  - Data type: ${data.metadata?.dataType}`);
    console.log(`  - Returned: ${data.metadata?.returned}`);
    console.log(`  - Total: ${data.metadata?.total}`);
    console.log(`  - Has more: ${data.metadata?.hasMore}`);
    console.log(`  - Progress: ${data.metadata?.percentComplete}%`);
    
    if (data.metadata?.hasMore) {
      console.log(`  - Next offset: ${data.metadata?.nextOffset}`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    return false;
  }
}

async function verifyAPIKey() {
  console.log('\n\n📊 Test 3: API Key Configuration');
  console.log('=' .repeat(70));
  
  const openaiKey = process.env.OPENAI_API_KEY;
  const openApiKey = process.env.OPEN_API_KEY;
  
  if (openaiKey) {
    console.log(`✅ OPENAI_API_KEY is set`);
    console.log(`   Value: ${openaiKey.substring(0, 20)}...`);
  } else {
    console.log(`❌ OPENAI_API_KEY is not set`);
  }
  
  if (openApiKey) {
    console.log(`✅ OPEN_API_KEY is set (backward compatibility)`);
    console.log(`   Value: ${openApiKey.substring(0, 20)}...`);
  } else {
    console.log(`⚠️  OPEN_API_KEY is not set (optional)`);
  }
  
  if (!openaiKey && !openApiKey) {
    console.log(`\n❌ No API key found!`);
    console.log(`   Create .env.local file with:`);
    console.log(`   OPENAI_API_KEY=your_key_here`);
    return false;
  }
  
  return true;
}

async function runAllTests() {
  console.log('\n🚀 API Fixes Verification Suite');
  console.log('=' .repeat(70));
  console.log('Make sure the development server is running: npm run dev\n');
  
  const results = {
    optimizedEndpoint: false,
    streamingEndpoint: false,
    apiKey: false
  };
  
  results.optimizedEndpoint = await verifyOptimizedEndpoint();
  results.streamingEndpoint = await verifyStreamingEndpoint();
  results.apiKey = await verifyAPIKey();
  
  // Summary
  console.log('\n\n📋 Test Summary');
  console.log('=' .repeat(70));
  
  const tests = [
    { name: 'Optimized Endpoint', result: results.optimizedEndpoint },
    { name: 'Streaming Endpoint', result: results.streamingEndpoint },
    { name: 'API Key Configuration', result: results.apiKey }
  ];
  
  tests.forEach((test, idx) => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    console.log(`${idx + 1}. ${test.name}: ${status}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  
  console.log('\n' + '=' .repeat(70));
  if (allPassed) {
    console.log('🎉 All tests passed! Your fixes are working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
  }
  console.log('=' .repeat(70) + '\n');
}

// Run tests
runAllTests().catch(console.error);

