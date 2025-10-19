/**
 * OpenAI RAG API Endpoint
 * 
 * Python-powered RAG system for intelligent F1 race analysis
 * Uses OpenAI GPT-4 with comprehensive race context
 */

import { spawn } from 'child_process';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, sessionKey, driverNumber, question, raceData } = req.body;

  if (!sessionKey || !driverNumber) {
    return res.status(400).json({ 
      error: 'sessionKey and driverNumber are required'
    });
  }

  if (!action || (action !== 'summary' && action !== 'question')) {
    return res.status(400).json({ 
      error: 'action must be "summary" or "question"'
    });
  }

  if (action === 'question' && !question) {
    return res.status(400).json({ 
      error: 'question is required for question action'
    });
  }

  console.log(`[OpenAI RAG] ${action} for driver #${driverNumber} in session ${sessionKey}`);

  const startTime = Date.now();

  try {
    // Use the RAG v2 system with embeddings
    const scriptPath = path.join(process.cwd(), 'montecarlo', 'openai_rag_v2.py');
    
    // Build arguments
    const args = [scriptPath, sessionKey, driverNumber.toString(), action];
    
    if (action === 'question') {
      args.push(question);
    }

    // Set environment variables for Python subprocess
    const env = {
      ...process.env,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || '',
      PYTHONUNBUFFERED: '1' // Ensure Python output isn't buffered
    };

    // Run Python script with environment
    const result = await runPythonScript('python', args, env);
    
    const totalTime = Date.now() - startTime;
    
    console.log(`[OpenAI RAG] ✓ Completed in ${totalTime}ms`);
    
    return res.status(200).json({
      ...result,
      api_metadata: {
        total_time_ms: totalTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`[OpenAI RAG] ❌ Error:`, error);
    return res.status(500).json({
      error: 'RAG analysis failed',
      details: error.message,
      hint: 'Make sure OPENAI_API_KEY is set and openai package is installed'
    });
  }
}

function runPythonScript(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { env });
    
    let stdoutData = '';
    let stderrData = '';
    
    process.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      // Echo Python output for debugging
      global.console.log(output);
    });
    
    process.stderr.on('data', (data) => {
      stderrData += data.toString();
      global.console.error(data.toString());
    });
    
    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderrData || `Process exited with code ${code}`));
        return;
      }
      
      try {
        // Extract JSON from output (script outputs JSON at the end)
        const lines = stdoutData.trim().split('\n');
        let jsonOutput = '';
        let inJson = false;
        let jsonLines = [];
        let braceCount = 0;
        
        for (const line of lines) {
          if (line.trim().startsWith('{')) {
            inJson = true;
            jsonLines = [line];
            braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
          } else if (inJson) {
            jsonLines.push(line);
            braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
            
            if (braceCount === 0) {
              jsonOutput = jsonLines.join('\n');
              break;
            }
          }
        }
        
        if (!jsonOutput) {
          throw new Error('No JSON output found in Python script');
        }
        
        const result = JSON.parse(jsonOutput);
        
        if (result.status === 'success') {
          resolve(result);
        } else {
          reject(new Error(result.error || 'Unknown error from Python script'));
        }
      } catch (parseError) {
        console.error('Parse error:', parseError);
        console.error('Raw output:', stdoutData);
        reject(new Error(`Failed to parse output: ${parseError.message}`));
      }
    });
    
    process.on('error', (error) => {
      reject(error);
    });
  });
}

