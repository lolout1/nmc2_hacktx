"""
OpenAI RAG System V2 - With Embeddings

Uses the new RAG engine for optimal context retrieval.
Only sends relevant race data chunks to OpenAI, solving the 4MB issue.
"""

import json
import sys
import os

# Add parent directory to path to import RAG modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from rag.rag_engine import RAGEngine

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("Warning: OpenAI package not installed. Run: pip install openai")


class OpenAIRaceAnalystV2:
    """
    OpenAI-powered Race Strategy Analyst V2
    
    Uses RAG engine with embeddings for optimal context retrieval
    """
    
    def __init__(self, api_key: str, session_key: str):
        if not OPENAI_AVAILABLE:
            raise ImportError("OpenAI package not installed")
        
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-3.5-turbo"  # Fast and cost-effective
        
        # Initialize RAG engine
        print(f"[OpenAI RAG V2] Initializing RAG engine for session {session_key}...")
        self.rag = RAGEngine(session_key)
        
        print(f"[OpenAI RAG V2] Ready")
    
    def generate_summary(self, driver_number: int) -> str:
        """Generate automatic race summary for driver"""
        
        # Use RAG to get relevant context
        question = f"What is the current race situation for driver #{driver_number}?"
        rag_result = self.rag.query(question, driver_number, top_k=8)
        
        context = rag_result['context']
        
        system_prompt = """You are an expert F1 race strategist and data analyst. 
You provide clear, actionable insights based on real-time race data.
Be concise, data-driven, and specific. Focus on what matters for winning the race."""
        
        user_prompt = f"""{context}

Based on the above race data, provide a strategic summary for the race engineer.

Format your response EXACTLY as:

**SITUATION**
[1-2 sentences describing current race position and performance]

**KEY CONCERNS**
• [Concern 1]
• [Concern 2]
• [Concern 3]

**OPPORTUNITIES**
• [Opportunity 1]
• [Opportunity 2]

**IMMEDIATE ACTION**
[One clear, specific recommendation]

Be direct. Use data. No fluff."""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            summary = response.choices[0].message.content
            
            return summary
            
        except Exception as e:
            print(f"[OpenAI RAG V2] Error generating summary: {e}")
            raise
    
    def answer_question(self, question: str, driver_number: int) -> str:
        """Answer specific question about race"""
        
        # Use RAG to get relevant context
        rag_result = self.rag.query(question, driver_number, top_k=6)
        
        context = rag_result['context']
        
        system_prompt = """You are an expert F1 race strategist with deep knowledge of racing, 
strategy, tire management, and data analysis. Answer questions clearly and specifically, 
using the provided race data. Be direct and actionable."""
        
        user_prompt = f"""{context}

**QUESTION:** {question}

Provide a clear, data-driven answer. Reference specific numbers from the data when relevant."""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            answer = response.choices[0].message.content
            
            return answer
            
        except Exception as e:
            print(f"[OpenAI RAG V2] Error answering question: {e}")
            raise


def main():
    """CLI interface for testing"""
    if len(sys.argv) < 4:
        print("Usage: python openai_rag_v2.py <session_key> <driver_number> <action> [question]")
        print("Actions: summary, question")
        print("Example: python openai_rag_v2.py 9161 1 summary")
        print("Example: python openai_rag_v2.py 9161 1 question 'Should we pit now?'")
        sys.exit(1)
    
    session_key = sys.argv[1]
    driver_number = int(sys.argv[2])
    action = sys.argv[3]
    
    # Get API key from environment
    api_key = os.getenv('OPENAI_API_KEY') or os.getenv('OPEN_API_KEY')
    if not api_key:
        print("Error: OPENAI_API_KEY or OPEN_API_KEY environment variable not set")
        sys.exit(1)
    
    print(f"\n{'='*70}")
    print(f"OpenAI RAG System V2 - F1 Race Analysis")
    print(f"{'='*70}")
    print(f"Session: {session_key}")
    print(f"Driver: #{driver_number}")
    print(f"Action: {action}")
    print(f"{'='*70}\n")
    
    # Initialize analyst
    analyst = OpenAIRaceAnalystV2(api_key, session_key)
    
    if action == 'summary':
        print("\nGenerating strategic summary...\n")
        summary = analyst.generate_summary(driver_number)
        print(summary)
        
        # Output as JSON for API
        output = {
            'status': 'success',
            'type': 'summary',
            'driver_number': driver_number,
            'summary': summary,
            'timestamp': datetime.now().isoformat(),
            'source': 'openai-rag-v2'
        }
        print(f"\n\n{json.dumps(output, indent=2)}")
        
    elif action == 'question':
        if len(sys.argv) < 5:
            print("Error: Question required")
            sys.exit(1)
        
        question = sys.argv[4]
        print(f"\nQuestion: {question}\n")
        print("Generating answer...\n")
        
        answer = analyst.answer_question(question, driver_number)
        print(answer)
        
        # Output as JSON for API
        from datetime import datetime
        output = {
            'status': 'success',
            'type': 'question',
            'driver_number': driver_number,
            'question': question,
            'answer': answer,
            'timestamp': datetime.now().isoformat(),
            'source': 'openai-rag-v2'
        }
        print(f"\n\n{json.dumps(output, indent=2)}")
    
    else:
        print(f"Error: Unknown action '{action}'")
        sys.exit(1)


if __name__ == '__main__':
    main()

