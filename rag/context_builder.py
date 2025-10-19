"""
Context Builder for RAG

Builds optimal context for AI queries from retrieved chunks.
Formats race data into concise, relevant prompts.
"""

from typing import List, Tuple, Dict, Any
from .embeddings import DataChunk


class ContextBuilder:
    """
    Builds context for AI queries from retrieved data chunks
    
    Formats chunks into human-readable text optimized for LLM prompts.
    """
    
    def __init__(self, max_tokens: int = 2000):
        """
        Initialize context builder
        
        Args:
            max_tokens: Maximum tokens for context (approximate)
        """
        self.max_tokens = max_tokens
        print(f"[RAG Context Builder] Initialized (max_tokens={max_tokens})")
    
    def build_context(
        self,
        retrieved_chunks: List[Tuple[DataChunk, float]],
        driver_number: int,
        query: str
    ) -> str:
        """
        Build context string from retrieved chunks
        
        Args:
            retrieved_chunks: List of (chunk, score) tuples
            driver_number: Driver number for focus
            query: Original query
            
        Returns:
            Formatted context string
        """
        if not retrieved_chunks:
            return self._build_fallback_context(driver_number)
        
        sections = []
        
        # Group chunks by type
        chunks_by_type = self._group_by_type(retrieved_chunks)
        
        # Build sections based on what we found
        if 'lap' in chunks_by_type:
            sections.append(self._build_lap_section(chunks_by_type['lap'], driver_number))
        
        if 'position' in chunks_by_type:
            sections.append(self._build_position_section(chunks_by_type['position'], driver_number))
        
        if 'pit' in chunks_by_type:
            sections.append(self._build_pit_section(chunks_by_type['pit'], driver_number))
        
        if 'weather' in chunks_by_type:
            sections.append(self._build_weather_section(chunks_by_type['weather']))
        
        if 'incident' in chunks_by_type:
            sections.append(self._build_incident_section(chunks_by_type['incident']))
        
        # Combine sections
        context = "\n\n".join([s for s in sections if s])
        
        # Add metadata
        header = f"# Race Data Context for Driver #{driver_number}\n"
        header += f"Query: {query}\n"
        header += f"Retrieved {len(retrieved_chunks)} relevant data chunks\n\n"
        
        return header + context
    
    def _group_by_type(
        self,
        chunks: List[Tuple[DataChunk, float]]
    ) -> Dict[str, List[Tuple[DataChunk, float]]]:
        """Group chunks by type"""
        grouped = {}
        for chunk, score in chunks:
            chunk_type = chunk.chunk_type
            if chunk_type not in grouped:
                grouped[chunk_type] = []
            grouped[chunk_type].append((chunk, score))
        return grouped
    
    def _build_lap_section(
        self,
        chunks: List[Tuple[DataChunk, float]],
        driver_number: int
    ) -> str:
        """Build lap performance section"""
        section = "## Lap Performance\n"
        
        for chunk, score in chunks:
            laps = chunk.data.get('laps', [])
            if not laps:
                continue
            
            lap_range = chunk.metadata.get('lap_range', (0, 0))
            section += f"- Laps {lap_range[0]}-{lap_range[1]}: "
            
            lap_times = [l.get('lap_duration') for l in laps if l.get('lap_duration')]
            if lap_times:
                avg_time = sum(lap_times) / len(lap_times)
                best_time = min(lap_times)
                section += f"Avg {avg_time:.3f}s, Best {best_time:.3f}s"
            
            section += f" (relevance: {score:.2f})\n"
        
        return section
    
    def _build_position_section(
        self,
        chunks: List[Tuple[DataChunk, float]],
        driver_number: int
    ) -> str:
        """Build position changes section"""
        section = "## Track Position\n"
        
        for chunk, score in chunks:
            changes = chunk.data.get('position_changes', [])
            if changes:
                section += f"- {len(changes)} position changes"
                best_pos = min(c['to'] for c in changes)
                section += f", Best position: P{best_pos}"
            
            # Add recent position if available
            recent_positions = chunk.data.get('all_positions', [])
            if recent_positions:
                current_pos = recent_positions[-1].get('position')
                section += f", Current: P{current_pos}"
            
            section += f" (relevance: {score:.2f})\n"
        
        return section
    
    def _build_pit_section(
        self,
        chunks: List[Tuple[DataChunk, float]]
    ) -> str:
        """Build pit stop section"""
        section = "## Pit Strategy\n"
        
        for chunk, score in chunks:
            pit_stops = chunk.data.get('pit_stops', [])
            if not pit_stops:
                continue
            
            section += f"- {len(pit_stops)} pit stops"
            
            durations = [p.get('pit_duration') for p in pit_stops if p.get('pit_duration')]
            if durations:
                avg_duration = sum(durations) / len(durations)
                section += f", Avg duration: {avg_duration:.1f}s"
            
            lap_numbers = [p.get('lap_number') for p in pit_stops if p.get('lap_number')]
            if lap_numbers:
                section += f", Laps: {', '.join(map(str, lap_numbers))}"
            
            section += f" (relevance: {score:.2f})\n"
        
        return section
    
    def _build_weather_section(
        self,
        chunks: List[Tuple[DataChunk, float]]
    ) -> str:
        """Build weather conditions section"""
        section = "## Weather Conditions\n"
        
        for chunk, score in chunks:
            weather_data = chunk.data.get('weather', [])
            if not weather_data:
                continue
            
            recent = weather_data[-1]
            section += f"- Air: {recent.get('air_temperature', 'N/A')}°C, "
            section += f"Track: {recent.get('track_temperature', 'N/A')}°C, "
            section += f"Humidity: {recent.get('humidity', 'N/A')}%"
            section += f" (relevance: {score:.2f})\n"
        
        return section
    
    def _build_incident_section(
        self,
        chunks: List[Tuple[DataChunk, float]]
    ) -> str:
        """Build race incidents section"""
        section = "## Race Incidents\n"
        
        for chunk, score in chunks:
            incidents = chunk.data.get('incidents', [])
            if not incidents:
                continue
            
            section += f"- {len(incidents)} recent incidents:\n"
            for incident in incidents[:5]:  # Show top 5
                msg = incident.get('message', 'Unknown')
                section += f"  • {msg}\n"
            
            section += f"(relevance: {score:.2f})\n"
        
        return section
    
    def _build_fallback_context(self, driver_number: int) -> str:
        """Build fallback context when no chunks retrieved"""
        return f"""# Race Data Context for Driver #{driver_number}

No specific data chunks were retrieved for this query.
Using general race context."""
    
    def estimate_tokens(self, text: str) -> int:
        """
        Estimate token count (rough approximation)
        
        Args:
            text: Text to estimate
            
        Returns:
            Approximate token count
        """
        # Rough estimate: 1 token ≈ 4 characters
        return len(text) // 4
    
    def truncate_context(self, context: str) -> str:
        """
        Truncate context to fit within max tokens
        
        Args:
            context: Context string
            
        Returns:
            Truncated context
        """
        estimated_tokens = self.estimate_tokens(context)
        
        if estimated_tokens <= self.max_tokens:
            return context
        
        # Truncate to approximate token limit
        char_limit = self.max_tokens * 4
        truncated = context[:char_limit]
        
        # Try to truncate at sentence boundary
        last_period = truncated.rfind('.')
        if last_period > char_limit * 0.8:  # At least 80% of desired length
            truncated = truncated[:last_period + 1]
        
        truncated += "\n\n[Context truncated to fit token limit]"
        
        return truncated

