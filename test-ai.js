#!/usr/bin/env node

/**
 * CLI Test Script for AI Agent
 *
 * Usage:
 *   node test-ai.js summary <sessionKey> <driverNumber> [driverName]
 *   node test-ai.js question <sessionKey> <driverNumber> "<question>" [driverName]
 *
 * Examples:
 *   node test-ai.js summary 9158 1 "Max Verstappen"
 *   node test-ai.js question 9158 1 "Should we pit now?" "Max Verstappen"
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testAI() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log('❌ Usage:');
    console.log('  Summary: node test-ai.js summary <sessionKey> <driverNumber> [driverName]');
    console.log('  Question: node test-ai.js question <sessionKey> <driverNumber> "<question>" [driverName]');
    console.log('');
    console.log('Examples:');
    console.log('  node test-ai.js summary 9158 1 "Max Verstappen"');
    console.log('  node test-ai.js question 9158 1 "Should we pit now?" "Max Verstappen"');
    process.exit(1);
  }

  const action = args[0]; // 'summary' or 'question'
  const sessionKey = args[1];
  const driverNumber = args[2];

  let question, driverName;

  if (action === 'question') {
    question = args[3];
    driverName = args[4] || `Driver #${driverNumber}`;
  } else {
    driverName = args[3] || `Driver #${driverNumber}`;
  }

  if (!['summary', 'question'].includes(action)) {
    console.log('❌ Error: Action must be "summary" or "question"');
    process.exit(1);
  }

  if (action === 'question' && !question) {
    console.log('❌ Error: Question is required for question action');
    process.exit(1);
  }

  console.log('🚀 Testing AI Agent');
  console.log('━'.repeat(50));
  console.log(`Action: ${action}`);
  console.log(`Session: ${sessionKey}`);
  console.log(`Driver: #${driverNumber} (${driverName})`);
  if (question) console.log(`Question: "${question}"`);
  console.log('━'.repeat(50));
  console.log('');

  const payload = {
    action,
    sessionKey,
    driverNumber,
    driverName,
    simple: true, // Use simple mode for basic responses
  };

  if (action === 'question') {
    payload.question = question;
  }

  try {
    console.log('📡 Sending request to API...');
    const startTime = Date.now();

    const response = await fetch(`${API_URL}/api/ai/fallback-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log(`❌ API Error (${response.status}):`, errorData.error || errorData.details || 'Unknown error');
      process.exit(1);
    }

    const data = await response.json();

    console.log(`✅ Response received in ${elapsed}ms`);
    console.log('━'.repeat(50));
    console.log('');

    if (action === 'summary') {
      console.log('📊 AI SUMMARY:');
      console.log('');
      console.log(data.summary || data.answer || 'No summary generated');
    } else {
      console.log('💬 AI ANSWER:');
      console.log('');
      console.log(data.answer || data.summary || 'No answer generated');
    }

    console.log('');
    console.log('━'.repeat(50));
    console.log('📋 Metadata:');
    console.log(`  Source: ${data.source || 'unknown'}`);
    console.log(`  Type: ${data.type || 'unknown'}`);
    console.log(`  Timestamp: ${data.timestamp || 'N/A'}`);
    console.log('━'.repeat(50));

  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('');
    console.log('💡 Tip: Make sure your Next.js dev server is running:');
    console.log('   npm run dev');
    process.exit(1);
  }
}

// Run the test
testAI();
