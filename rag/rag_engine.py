"""
RAG Engine for F1 Race Data

Main orchestrator for Retrieval-Augmented Generation.
Combines embeddings, vector search, and context building for optimal AI queries.
"""

import os
import sys
import json
import pandas as pd
from typing import Dict, List, Any, Optional
from dataclasses import asdict

from .embeddings import RaceDataEmbedder, EMBEDDINGS_AVAILABLE
from .vector_store import VectorStore
from .context_builder import ContextBuilder


class RAGEngine:
    """
    Main RAG engine for F1 race data
    
    Orchestrates the entire RAG pipeline:
    1. Load and chunk race data
    2. Generate embeddings
    3. Store in vector database
    4. Retrieve relevant context for queries
    5. Build optimal prompts for AI
    """
    
    def __init__(
        self,
        session_key: str,
        cache_dir: str = '.openf1_cache',
        model_name: str = 'all-MiniLM-L6-v2'
    ):
        """
        Initialize RAG engine
        
        Args:
            session_key: Session key to load
            cache_dir: Directory with cached OpenF1 data
            model_name: Sentence transformer model name
        """
        self.session_key = session_key
        self.cache_dir = cache_dir
        
        if not EMBEDDINGS_AVAILABLE:
            raise ImportError(
                "RAG engine requires sentence-transformers. "
                "Install: pip install sentence-transformers"
            )
        
        print(f"\n{'='*70}")
        print(f"RAG Engine Initialization - Session {session_key}")
        print(f"{'='*70}\n")
        
        # Initialize components
        self.embedder = RaceDataEmbedder(model_name=model_name)
        self.vector_store = VectorStore()
        self.context_builder = ContextBuilder(max_tokens=2000)
        
        # Load and process data
        self._load_session_data()
        self._create_and_store_embeddings()
        
        print(f"\n{'='*70}")
        print(f"RAG Engine Ready")
        print(f"{'='*70}\n")
    
    def _load_session_data(self):
        """Load session data from cache"""
        print("[RAG Engine] Loading session data...")
        
        cache_path = os.path.join(os.getcwd(), self.cache_dir)
        
        # Load all data files
        self.laps = self._load_csv(cache_path, 'laps')
        self.positions = self._load_csv(cache_path, 'positions')
        self.pit_stops = self._load_csv(cache_path, 'pit')
        self.weather = self._load_csv(cache_path, 'weather')
        self.race_control = self._load_csv(cache_path, 'race_control')
        self.metadata = self._load_json(cache_path, 'metadata')
        
        print(f"[RAG Engine] ✓ Loaded session data:")
        print(f"  - Laps: {len(self.laps)}")
        print(f"  - Positions: {len(self.positions)}")
        print(f"  - Pit stops: {len(self.pit_stops)}")
        print(f"  - Weather: {len(self.weather)}")
        print(f"  - Race control: {len(self.race_control)}")
    
    def _load_csv(self, cache_path: str, data_type: str) -> List[Dict]:
        """Load CSV file as list of dicts"""
        filepath = os.path.join(cache_path, f'session_{self.session_key}_{data_type}.csv')
        
        if not os.path.exists(filepath):
            print(f"[RAG Engine] Warning: {data_type} file not found")
            return []
        
        try:
            df = pd.read_csv(filepath)
            return df.to_dict('records')
        except Exception as e:
            print(f"[RAG Engine] Error loading {data_type}: {e}")
            return []
    
    def _load_json(self, cache_path: str, data_type: str) -> Dict:
        """Load JSON file"""
        filepath = os.path.join(cache_path, f'session_{self.session_key}_{data_type}.json')
        
        if not os.path.exists(filepath):
            print(f"[RAG Engine] Warning: {data_type} file not found")
            return {}
        
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"[RAG Engine] Error loading {data_type}: {e}")
            return {}
    
    def _create_and_store_embeddings(self):
        """Create embeddings for all data and store in vector DB"""
        print("[RAG Engine] Creating embeddings...")
        
        all_chunks = []
        
        # Get unique driver numbers
        driver_numbers = set()
        for lap in self.laps:
            driver_numbers.add(lap.get('driver_number'))
        
        print(f"[RAG Engine] Processing data for {len(driver_numbers)} drivers...")
        
        # Create chunks for each driver
        for driver_num in sorted(driver_numbers):
            # Lap data chunks
            lap_chunks = self.embedder.chunk_lap_data(self.laps, driver_number=driver_num)
            all_chunks.extend(lap_chunks)
            
            # Position chunks
            pos_chunks = self.embedder.chunk_position_data(self.positions, driver_number=driver_num)
            all_chunks.extend(pos_chunks)
            
            # Pit stop chunks
            pit_chunks = self.embedder.chunk_pit_stops(self.pit_stops, driver_number=driver_num)
            all_chunks.extend(pit_chunks)
        
        # Weather chunks (global)
        weather_chunks = self.embedder.chunk_weather_data(self.weather)
        all_chunks.extend(weather_chunks)
        
        # Race control chunks (global)
        incident_chunks = self.embedder.chunk_race_control(self.race_control)
        all_chunks.extend(incident_chunks)
        
        print(f"[RAG Engine] Created {len(all_chunks)} data chunks")
        
        # Generate embeddings
        all_chunks = self.embedder.embed_chunks(all_chunks)
        
        # Store in vector database
        self.vector_store.add_chunks(all_chunks)
        
        # Print stats
        stats = self.vector_store.stats()
        print(f"[RAG Engine] ✓ Vector store stats:")
        for chunk_type, count in stats['chunk_types'].items():
            print(f"  - {chunk_type}: {count} chunks")
    
    def query(
        self,
        question: str,
        driver_number: int,
        top_k: int = 5,
        include_driver_specific: bool = True
    ) -> Dict[str, Any]:
        """
        Query the RAG system
        
        Args:
            question: User question
            driver_number: Driver number for context
            top_k: Number of chunks to retrieve
            include_driver_specific: Whether to filter for driver-specific data
            
        Returns:
            Dict with context and metadata
        """
        print(f"\n[RAG Query] Question: {question}")
        print(f"[RAG Query] Driver: #{driver_number}, Top-K: {top_k}")
        
        # Generate query embedding
        query_embedding = self.embedder.embed_query(question)
        
        # Retrieve relevant chunks
        if include_driver_specific:
            # First get driver-specific chunks
            driver_results = self.vector_store.search_by_metadata(
                {'driver_number': driver_number},
                query_embedding=query_embedding,
                top_k=top_k
            )
            
            # Then get general chunks (weather, incidents)
            general_results = self.vector_store.search(
                query_embedding,
                top_k=2,  # Just a few general chunks
                chunk_type=None
            )
            # Filter out driver-specific from general results
            general_results = [
                (chunk, score) for chunk, score in general_results
                if chunk.metadata.get('driver_number') is None
            ]
            
            # Combine results
            retrieved_chunks = driver_results + general_results
        else:
            # Just semantic search
            retrieved_chunks = self.vector_store.search(
                query_embedding,
                top_k=top_k
            )
        
        print(f"[RAG Query] Retrieved {len(retrieved_chunks)} relevant chunks")
        for chunk, score in retrieved_chunks[:3]:  # Show top 3
            print(f"  - {chunk.chunk_type}: {chunk.chunk_id} (score: {score:.3f})")
        
        # Build context
        context = self.context_builder.build_context(
            retrieved_chunks,
            driver_number,
            question
        )
        
        # Truncate if needed
        context = self.context_builder.truncate_context(context)
        
        # Prepare response
        response = {
            'context': context,
            'num_chunks_retrieved': len(retrieved_chunks),
            'chunks': [
                {
                    'chunk_id': chunk.chunk_id,
                    'chunk_type': chunk.chunk_type,
                    'content': chunk.content,
                    'score': score
                }
                for chunk, score in retrieved_chunks
            ],
            'metadata': {
                'driver_number': driver_number,
                'session_key': self.session_key,
                'top_k': top_k
            }
        }
        
        token_estimate = self.context_builder.estimate_tokens(context)
        print(f"[RAG Query] ✓ Context built (~{token_estimate} tokens)")
        
        return response
    
    def get_driver_summary(self, driver_number: int) -> str:
        """
        Get a comprehensive summary for a specific driver
        
        Args:
            driver_number: Driver number
            
        Returns:
            Summary text
        """
        # Get all driver-specific chunks
        lap_chunks = self.vector_store.get_chunks_by_type('lap')
        pos_chunks = self.vector_store.get_chunks_by_type('position')
        pit_chunks = self.vector_store.get_chunks_by_type('pit')
        
        # Filter for this driver
        driver_laps = [c for c in lap_chunks if c.metadata.get('driver_number') == driver_number]
        driver_pos = [c for c in pos_chunks if c.metadata.get('driver_number') == driver_number]
        driver_pits = [c for c in pit_chunks if c.metadata.get('driver_number') == driver_number]
        
        # Build summary
        summary = f"# Driver #{driver_number} Summary\n\n"
        summary += f"- Lap data: {len(driver_laps)} chunks\n"
        summary += f"- Position data: {len(driver_pos)} chunks\n"
        summary += f"- Pit stops: {len(driver_pits)} chunks\n"
        
        return summary


def main():
    """CLI interface for RAG engine"""
    if len(sys.argv) < 4:
        print("Usage: python rag_engine.py <session_key> <driver_number> <question>")
        print("Example: python rag_engine.py 9161 1 'Should we pit now?'")
        sys.exit(1)
    
    session_key = sys.argv[1]
    driver_number = int(sys.argv[2])
    question = sys.argv[3]
    
    # Initialize RAG engine
    rag = RAGEngine(session_key)
    
    # Query
    result = rag.query(question, driver_number)
    
    # Output as JSON
    output = {
        'status': 'success',
        'driver_number': driver_number,
        'question': question,
        'context': result['context'],
        'num_chunks': result['num_chunks_retrieved']
    }
    
    print(f"\n\n{json.dumps(output, indent=2)}")


if __name__ == '__main__':
    main()

