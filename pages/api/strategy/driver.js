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
    
    // Spawn Python process
    const pythonProcess = spawn('python', [scriptPath, driverNumber, sessionKey]);

    let stdoutData = '';
    let stderrData = '';

    // Collect stdout
    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    // Collect stderr
    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`[Strategy API] Python error:`, stderrData);
        return res.status(500).json({
          error: 'Strategy calculation failed',
          details: stderrData
        });
      }

      try {
        // Parse JSON output from Python script
        const strategies = JSON.parse(stdoutData);
        
        console.log(`[Strategy API] ✓ Strategy calculated for driver ${driverNumber}`);
        console.log(`[Strategy API] Top decision: ${strategies.topDecision?.action} (${strategies.topDecision?.confidence}% confidence)`);
        
        return res.status(200).json({
          driverNumber,
          sessionKey,
          timestamp: new Date().toISOString(),
          strategies
        });
      } catch (parseError) {
        console.error(`[Strategy API] Failed to parse Python output:`, parseError);
        return res.status(500).json({
          error: 'Failed to parse strategy results',
          output: stdoutData
        });
      }
    });

    // Handle process errors
    pythonProcess.on('error', (error) => {
      console.error(`[Strategy API] Failed to start Python process:`, error);
      return res.status(500).json({
        error: 'Failed to run strategy calculation',
        details: error.message
      });
    });

  } catch (error) {
    console.error(`[Strategy API] Error:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

