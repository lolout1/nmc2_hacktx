/**
 * RAG-Powered AI Query API
 * 
 * Uses embeddings and vector search to retrieve only relevant race data
 * Solves the 4MB response size issue by sending targeted context
 */

import { spawn } from 'child_process';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, sessionKey, driverNumber } = req.body;

  if (!sessionKey || !driverNumber) {
    return res.status(400).json({ 
      error: 'sessionKey and driverNumber are required' 
    });
  }

  if (!question) {
    return res.status(400).json({ 
      error: 'question is required' 
    });
  }

  console.log(`[RAG API] Query for driver #${driverNumber} in session ${sessionKey}`);
  console.log(`[RAG API] Question: ${question}`);

  try {
    // Path to Python RAG script
    const scriptPath = path.join(process.cwd(), 'rag', 'rag_engine.py');
    
    // Use Promise to properly handle async Python process
    const result = await runPythonScript('python', [scriptPath, sessionKey, driverNumber.toString(), question]);
    
    console.log(`[RAG API] ✓ Context retrieved successfully`);
    console.log(`[RAG API] Retrieved ${result.num_chunks} relevant chunks`);
    
    return res.status(200).json({
      status: 'success',
      driver_number: driverNumber,
      session_key: sessionKey,
      question: question,
      context: result.context,
      num_chunks: result.num_chunks,
      timestamp: new Date().toISOString(),
      source: 'rag-embeddings'
    });

  } catch (error) {
    console.error(`[RAG API] Error:`, error);
    return res.status(500).json({
      error: 'RAG query failed',
      details: error.message,
      hint: 'Make sure sentence-transformers is installed: pip install sentence-transformers'
    });
  }
}

function runPythonScript(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args);
    
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
        // Extract JSON from output (last JSON object in output)
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

