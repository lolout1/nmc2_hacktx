"""
Vector Store for RAG

Stores and retrieves embeddings using cosine similarity search.
Efficient in-memory vector database for race data.
"""

import numpy as np
from typing import List, Tuple
from .embeddings import DataChunk


class VectorStore:
    """
    In-memory vector store with cosine similarity search
    
    Stores data chunks with their embeddings and provides
    fast similarity-based retrieval.
    """
    
    def __init__(self):
        """Initialize empty vector store"""
        self.chunks: List[DataChunk] = []
        self.embeddings: np.ndarray = None
        print("[RAG Vector Store] Initialized")
    
    def add_chunks(self, chunks: List[DataChunk]):
        """
        Add chunks to the vector store
        
        Args:
            chunks: List of DataChunk objects with embeddings
        """
        if not chunks:
            return
        
        # Filter out chunks without embeddings
        valid_chunks = [c for c in chunks if c.embedding is not None]
        
        if not valid_chunks:
            print("[RAG Vector Store] Warning: No valid embeddings to add")
            return
        
        self.chunks.extend(valid_chunks)
        
        # Stack embeddings into matrix
        new_embeddings = np.vstack([c.embedding for c in valid_chunks])
        
        if self.embeddings is None:
            self.embeddings = new_embeddings
        else:
            self.embeddings = np.vstack([self.embeddings, new_embeddings])
        
        print(f"[RAG Vector Store] Added {len(valid_chunks)} chunks. Total: {len(self.chunks)}")
    
    def search(self, query_embedding: np.ndarray, top_k: int = 5, chunk_type: str = None) -> List[Tuple[DataChunk, float]]:
        """
        Search for most similar chunks to query
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            chunk_type: Optional filter by chunk type
            
        Returns:
            List of (DataChunk, similarity_score) tuples
        """
        if self.embeddings is None or len(self.chunks) == 0:
            print("[RAG Vector Store] Warning: Empty vector store")
            return []
        
        # Filter by chunk type if specified
        if chunk_type:
            indices = [i for i, c in enumerate(self.chunks) if c.chunk_type == chunk_type]
            if not indices:
                return []
            filtered_embeddings = self.embeddings[indices]
            filtered_chunks = [self.chunks[i] for i in indices]
        else:
            filtered_embeddings = self.embeddings
            filtered_chunks = self.chunks
            indices = list(range(len(self.chunks)))
        
        # Compute cosine similarity
        similarities = self._cosine_similarity(query_embedding, filtered_embeddings)
        
        # Get top-k results
        top_k = min(top_k, len(similarities))
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        results = [
            (filtered_chunks[idx], float(similarities[idx]))
            for idx in top_indices
        ]
        
        return results
    
    def search_by_metadata(
        self,
        metadata_filter: dict,
        query_embedding: np.ndarray = None,
        top_k: int = 5
    ) -> List[Tuple[DataChunk, float]]:
        """
        Search chunks by metadata filters
        
        Args:
            metadata_filter: Dict of metadata key-value pairs to filter by
            query_embedding: Optional query embedding for similarity ranking
            top_k: Number of results to return
            
        Returns:
            List of (DataChunk, similarity_score) tuples
        """
        # Filter chunks by metadata
        filtered = []
        for chunk in self.chunks:
            match = all(
                chunk.metadata.get(k) == v
                for k, v in metadata_filter.items()
            )
            if match:
                filtered.append(chunk)
        
        if not filtered:
            return []
        
        # If query embedding provided, rank by similarity
        if query_embedding is not None:
            filtered_embeddings = np.vstack([c.embedding for c in filtered])
            similarities = self._cosine_similarity(query_embedding, filtered_embeddings)
            
            # Sort by similarity
            top_k = min(top_k, len(filtered))
            top_indices = np.argsort(similarities)[-top_k:][::-1]
            
            results = [
                (filtered[idx], float(similarities[idx]))
                for idx in top_indices
            ]
        else:
            # No ranking, just return filtered chunks
            results = [(chunk, 1.0) for chunk in filtered[:top_k]]
        
        return results
    
    def _cosine_similarity(self, query: np.ndarray, embeddings: np.ndarray) -> np.ndarray:
        """
        Compute cosine similarity between query and embeddings
        
        Args:
            query: Query embedding vector (1D)
            embeddings: Matrix of embedding vectors (2D)
            
        Returns:
            Array of similarity scores
        """
        # Normalize vectors
        query_norm = query / (np.linalg.norm(query) + 1e-10)
        embeddings_norm = embeddings / (np.linalg.norm(embeddings, axis=1, keepdims=True) + 1e-10)
        
        # Compute dot product (cosine similarity for normalized vectors)
        similarities = np.dot(embeddings_norm, query_norm)
        
        return similarities
    
    def get_chunk_by_id(self, chunk_id: str) -> DataChunk:
        """Get chunk by ID"""
        for chunk in self.chunks:
            if chunk.chunk_id == chunk_id:
                return chunk
        return None
    
    def get_chunks_by_type(self, chunk_type: str) -> List[DataChunk]:
        """Get all chunks of a specific type"""
        return [c for c in self.chunks if c.chunk_type == chunk_type]
    
    def clear(self):
        """Clear all data from store"""
        self.chunks = []
        self.embeddings = None
        print("[RAG Vector Store] Cleared")
    
    def stats(self) -> dict:
        """Get statistics about the vector store"""
        if not self.chunks:
            return {
                'total_chunks': 0,
                'chunk_types': {}
            }
        
        chunk_types = {}
        for chunk in self.chunks:
            chunk_types[chunk.chunk_type] = chunk_types.get(chunk.chunk_type, 0) + 1
        
        return {
            'total_chunks': len(self.chunks),
            'chunk_types': chunk_types,
            'embedding_dimension': self.embeddings.shape[1] if self.embeddings is not None else 0
        }

