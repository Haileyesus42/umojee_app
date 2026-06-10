from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, DateTime, select
from sqlalchemy.sql import func
from sqlalchemy import text
from pgvector.sqlalchemy import Vector

# Simple config to replace the import
class Config:
    EMBEDDING_SIZE = 512  # Default embedding size for face recognition

settings = Config()

import numpy as np

# Use a separate Base for face recognition models since they need pgvector
FaceBase = declarative_base()


class UserFace(FaceBase):
    __tablename__ = "user_faces"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    embedding = Column(Vector(settings.EMBEDDING_SIZE))  # pgvector column for embeddings
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


def insert_face_embedding(db_session, user_id: str, name: str, embedding: list):
    """Insert a new face embedding into the database"""
    user_face = UserFace(
        user_id=user_id,
        name=name,
        embedding=embedding
    )
    db_session.add(user_face)
    db_session.commit()
    db_session.refresh(user_face)
    return user_face


def find_similar_faces(db_session, query_embedding: list, limit: int = 5):
    """Find similar faces using cosine similarity"""
    # Using raw SQL for pgvector similarity search
    sql = text("""
        SELECT user_id, name, embedding, 
               embedding <=> :query_embedding AS distance
        FROM user_faces
        ORDER BY embedding <=> :query_embedding
        LIMIT :limit
    """)
    
    result = db_session.execute(
        sql,
        {
            "query_embedding": str(query_embedding),
            "limit": limit
        }
    )
    
    rows = result.fetchall()
    # Convert distances to similarities (1 - distance)
    results = []
    for row in rows:
        similarity = 1 - float(row.distance)  # Convert L2 distance to similarity
        results.append({
            "user_id": row.user_id,
            "name": row.name,
            "similarity": similarity,
            "distance": float(row.distance)
        })
    
    return results


# Async versions of the functions for async database sessions
async def insert_face_embedding_async(async_db_session, user_id: str, name: str, embedding: list):
    """Async version to insert a new face embedding into the database"""
    user_face = UserFace(
        user_id=user_id,
        name=name,
        embedding=embedding
    )
    async_db_session.add(user_face)
    await async_db_session.commit()
    await async_db_session.refresh(user_face)
    return user_face


async def find_similar_faces_async(async_db_session, query_embedding: list, limit: int = 5):
    """Async version to find similar faces using cosine similarity"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Log the query for debugging
    logger.info(f"Searching for similar faces with embedding of length {len(query_embedding) if query_embedding else 0}")
    
    # First, check how many records exist in the database
    count_result = await async_db_session.execute(text("SELECT COUNT(*) FROM user_faces"))
    total_records = count_result.scalar()
    logger.info(f"Total face records in database: {total_records}")
    
    # Using raw SQL for pgvector similarity search
    sql = text("""
        SELECT user_id, name, embedding, 
               embedding <=> :query_embedding AS distance
        FROM user_faces
        ORDER BY embedding <=> :query_embedding
        LIMIT :limit
    """)
    
    result = await async_db_session.execute(
        sql,
        {
            "query_embedding": str(query_embedding),
            "limit": limit
        }
    )
    
    rows = result.fetchall()
    logger.info(f"Found {len(rows)} similar face candidates")
    
    # Convert distances to similarities (1 - distance)
    results = []
    for row in rows:
        similarity = 1 - float(row.distance)  # Convert L2 distance to similarity
        results.append({
            "user_id": row.user_id,
            "name": row.name,
            "similarity": similarity,
            "distance": float(row.distance)
        })
        logger.info(f"Similar face candidate: user_id={row.user_id}, name={row.name}, similarity={similarity}")
    
    return results