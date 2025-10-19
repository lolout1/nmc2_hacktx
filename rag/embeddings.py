"""
Race Data Embedder

Creates semantic embeddings for F1 race data chunks.
Uses sentence-transformers for efficient embedding generation.
"""

import json
import numpy as np
from typing import List, Dict, Any
from dataclasses import dataclass

# Use lightweight sentence-transformers for embeddings
try:
    from sentence_transformers import SentenceTransformer
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    print("Warning: sentence-transformers not installed. Run: pip install sentence-transformers")


@dataclass
class DataChunk:
    """Represents a chunk of race data with metadata"""
    chunk_id: str
    chunk_type: str  # 'lap', 'position', 'pit', 'weather', 'incident'
    content: str  # Human-readable text description
    data: Dict[Any, Any]  # Raw data
    metadata: Dict[str, Any]  # Additional metadata
    embedding: np.ndarray = None


class RaceDataEmbedder:
    """
    Creates semantic embeddings for race data chunks
    
    Uses all-MiniLM-L6-v2 model (fast, 384 dimensions)
    for efficient embedding generation
    """
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initialize embedder
        
        Args:
            model_name: SentenceTransformer model name
        """
        if not EMBEDDINGS_AVAILABLE:
            raise ImportError("sentence-transformers not installed")
        
        print(f"[RAG Embedder] Loading model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.embedding_dim = self.model.get_sentence_embedding_dimension()
        print(f"[RAG Embedder] Model loaded. Embedding dimension: {self.embedding_dim}")
    
    def chunk_lap_data(self, laps: List[Dict], driver_number: int = None) -> List[DataChunk]:
        """
        Chunk lap data into semantic units
        
        Args:
            laps: List of lap data dictionaries
            driver_number: Optional driver number to filter
            
        Returns:
            List of DataChunk objects
        """
        chunks = []
        
        # Filter by driver if specified
        if driver_number:
            laps = [lap for lap in laps if lap.get('driver_number') == driver_number]
        
        # Group laps into chunks of 5 for better context
        chunk_size = 5
        for i in range(0, len(laps), chunk_size):
            chunk_laps = laps[i:i + chunk_size]
            
            # Create human-readable description
            lap_numbers = [lap.get('lap_number', 0) for lap in chunk_laps]
            lap_times = [lap.get('lap_duration', 0) for lap in chunk_laps]
            
            content = f"Laps {min(lap_numbers)}-{max(lap_numbers)}: "
            content += f"Average lap time: {np.mean([t for t in lap_times if t > 0]):.3f}s. "
            
            # Add performance trend
            if len(lap_times) >= 2:
                trend = "improving" if lap_times[-1] < lap_times[0] else "degrading"
                content += f"Trend: {trend}. "
            
            chunks.append(DataChunk(
                chunk_id=f"laps_{min(lap_numbers)}_{max(lap_numbers)}",
                chunk_type='lap',
                content=content,
                data={'laps': chunk_laps},
                metadata={
                    'lap_range': (min(lap_numbers), max(lap_numbers)),
                    'driver_number': driver_number
                }
            ))
        
        return chunks
    
    def chunk_position_data(self, positions: List[Dict], driver_number: int = None) -> List[DataChunk]:
        """Chunk position changes into semantic units"""
        chunks = []
        
        if driver_number:
            positions = [p for p in positions if p.get('driver_number') == driver_number]
        
        # Group position changes
        if len(positions) == 0:
            return chunks
        
        # Track position changes
        position_changes = []
        prev_position = None
        
        for pos in positions:
            curr_position = pos.get('position')
            if prev_position and curr_position != prev_position:
                position_changes.append({
                    'from': prev_position,
                    'to': curr_position,
                    'date': pos.get('date')
                })
            prev_position = curr_position
        
        if position_changes:
            content = f"Position changes: "
            content += f"{len(position_changes)} position changes. "
            if len(position_changes) > 0:
                content += f"Best position: P{min(p['to'] for p in position_changes)}. "
            
            chunks.append(DataChunk(
                chunk_id=f"positions_driver_{driver_number}",
                chunk_type='position',
                content=content,
                data={'position_changes': position_changes, 'all_positions': positions[-10:]},  # Last 10
                metadata={'driver_number': driver_number}
            ))
        
        return chunks
    
    def chunk_pit_stops(self, pit_stops: List[Dict], driver_number: int = None) -> List[DataChunk]:
        """Chunk pit stop data"""
        chunks = []
        
        if driver_number:
            pit_stops = [p for p in pit_stops if p.get('driver_number') == driver_number]
        
        if len(pit_stops) == 0:
            return chunks
        
        content = f"Pit stops: {len(pit_stops)} stops. "
        durations = [p.get('pit_duration', 0) for p in pit_stops if p.get('pit_duration')]
        
        if durations:
            content += f"Average duration: {np.mean(durations):.1f}s. "
            content += f"Best: {min(durations):.1f}s, Worst: {max(durations):.1f}s. "
        
        lap_numbers = [p.get('lap_number') for p in pit_stops]
        if lap_numbers:
            content += f"Laps: {', '.join(map(str, lap_numbers))}. "
        
        chunks.append(DataChunk(
            chunk_id=f"pitstops_driver_{driver_number}",
            chunk_type='pit',
            content=content,
            data={'pit_stops': pit_stops},
            metadata={'driver_number': driver_number, 'num_stops': len(pit_stops)}
        ))
        
        return chunks
    
    def chunk_weather_data(self, weather: List[Dict]) -> List[DataChunk]:
        """Chunk weather data"""
        chunks = []
        
        if len(weather) == 0:
            return chunks
        
        # Use recent weather (last 5 readings)
        recent = weather[-5:]
        
        content = f"Weather conditions: "
        air_temps = [w.get('air_temperature', 0) for w in recent]
        track_temps = [w.get('track_temperature', 0) for w in recent]
        
        if air_temps:
            content += f"Air temp: {np.mean(air_temps):.1f}°C. "
        if track_temps:
            content += f"Track temp: {np.mean(track_temps):.1f}°C. "
        
        humidity = recent[-1].get('humidity', 0)
        rainfall = recent[-1].get('rainfall', 0)
        
        content += f"Humidity: {humidity}%. "
        content += f"Rainfall: {'Yes' if rainfall else 'No'}. "
        
        chunks.append(DataChunk(
            chunk_id="weather_current",
            chunk_type='weather',
            content=content,
            data={'weather': recent},
            metadata={'num_readings': len(recent)}
        ))
        
        return chunks
    
    def chunk_race_control(self, race_control: List[Dict], limit: int = 10) -> List[DataChunk]:
        """Chunk race control messages (incidents, flags, etc.)"""
        chunks = []
        
        if len(race_control) == 0:
            return chunks
        
        # Use recent incidents
        recent = race_control[-limit:]
        
        content = f"Race incidents: {len(recent)} recent events. "
        
        # Categorize
        flags = [r for r in recent if r.get('flag')]
        safety_cars = [r for r in recent if 'SAFETY CAR' in r.get('message', '')]
        
        if flags:
            content += f"Flags: {len(flags)}. "
        if safety_cars:
            content += f"Safety car periods: {len(safety_cars)}. "
        
        chunks.append(DataChunk(
            chunk_id="race_control_recent",
            chunk_type='incident',
            content=content,
            data={'incidents': recent},
            metadata={'num_incidents': len(recent)}
        ))
        
        return chunks
    
    def embed_chunks(self, chunks: List[DataChunk]) -> List[DataChunk]:
        """
        Generate embeddings for all chunks
        
        Args:
            chunks: List of DataChunk objects
            
        Returns:
            Same chunks with embeddings added
        """
        if not chunks:
            return chunks
        
        print(f"[RAG Embedder] Generating embeddings for {len(chunks)} chunks...")
        
        # Extract text content
        texts = [chunk.content for chunk in chunks]
        
        # Generate embeddings in batch
        embeddings = self.model.encode(texts, show_progress_bar=False)
        
        # Add embeddings to chunks
        for chunk, embedding in zip(chunks, embeddings):
            chunk.embedding = embedding
        
        print(f"[RAG Embedder] ✓ Embeddings generated")
        
        return chunks
    
    def embed_query(self, query: str) -> np.ndarray:
        """
        Generate embedding for a query
        
        Args:
            query: Query text
            
        Returns:
            Query embedding vector
        """
        return self.model.encode([query])[0]

