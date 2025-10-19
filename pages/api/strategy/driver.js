/**
 * Driver-Specific Strategy API
 * Runs HPC Monte Carlo simulations for individual driver strategy optimization
 */

import { spawn } from 'child_process';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionKey, driverNumber } = req.query;

  if (!sessionKey || !driverNumber) {
    return res.status(400).json({ 
      error: 'sessionKey and driverNumber are required' 
    });
  }

  console.log(`[Strategy API] Computing strategy for driver ${driverNumber} in session ${sessionKey}`);

  try {
    // Path to Python script
    const scriptPath = path.join(process.cwd(), 'montecarlo', 'strategy_engine.py');
    
    // Use Promise to properly handle async Python process
    const result = await runPythonScript('python', [scriptPath, driverNumber, sessionKey]);
    
    console.log(`[Strategy API] ✓ Strategy calculated for driver ${driverNumber}`);
    console.log(`[Strategy API] Top decision: ${result.topDecision?.action} (${result.topDecision?.confidence}% confidence)`);
    
    return res.status(200).json({
      driverNumber,
      sessionKey,
      timestamp: new Date().toISOString(),
      strategies: result
    });

  } catch (error) {
    console.error(`[Strategy API] Error:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

function runPythonScript(command, args) {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const process = spawn(command, args);
    
    let stdoutData = '';
    let stderrData = '';
    
    process.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderrData += data.toString();
    });
    
    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderrData || `Process exited with code ${code}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdoutData);
        resolve(result);
      } catch (parseError) {
        reject(new Error(`Failed to parse output: ${parseError.message}`));
      }
    });
    
    process.on('error', (error) => {
      reject(error);
    });
  });
}

