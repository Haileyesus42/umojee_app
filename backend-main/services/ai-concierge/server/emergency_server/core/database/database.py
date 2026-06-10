import os
import sys
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from ..config import settings

# Add the backend directory to the path to ensure imports work correctly
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, str(backend_dir))

# Configuration
SQLALCHEMY_DATABASE_URL = settings.USER_DB_URL or "postgresql+asyncpg://face_user:Dingle100%25143@localhost/face_recognition"
FACE_RECOGNITION_DB_URL = settings.FACE_DB_URL or "postgresql+asyncpg://face_user:Dingle100%25143@localhost/face_recognition"

# Create the declarative base
Base = declarative_base()

# User database engine (PostgreSQL) - async engine
user_engine = create_async_engine(SQLALCHEMY_DATABASE_URL)

# Synchronous engine for user database (needed for non-async operations)
sync_user_engine = create_engine(SQLALCHEMY_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://"))
user_sync_session = sessionmaker(autocommit=False, autoflush=False, bind=sync_user_engine)

# Face recognition database engine (PostgreSQL) - async engine
face_engine = create_async_engine(FACE_RECOGNITION_DB_URL)

# Synchronous engine for face recognition database (needed for pgvector operations)
sync_face_engine = create_engine(FACE_RECOGNITION_DB_URL.replace("postgresql+asyncpg://", "postgresql://"))
sync_face_session = sessionmaker(autocommit=False, autoflush=False, bind=sync_face_engine)


def get_user_db():
    db = user_sync_session()
    try:
        yield db
    finally:
        db.close()


async def get_face_db():
    async with AsyncSession(face_engine, expire_on_commit=False) as session:
        yield session


def get_sync_face_db():
    db = sync_face_session()
    try:
        yield db
    finally:
        db.close()


async def init_user_db():
    """Initialize the user database and create tables (async version)"""
    from server.emergency_server.models.common.user import User
    from server.emergency_server.models.common.session import UserSession
    from server.emergency_server.models.common.travel_history import TravelHistory
    from server.emergency_server.models.communication.emergency_contact import EmergencyContact
    from server.emergency_server.models.emergency.emergency_log import EmergencyLog
    from server.emergency_server.models.biometric.palm_template import PalmTemplate
    async with user_engine.begin() as conn:
        from sqlalchemy import text
        # Create tables
        await conn.run_sync(lambda conn: Base.metadata.create_all(conn))


def init_user_db_sync():
    """Initialize the user database and create tables (sync version)"""
    from server.emergency_server.models.common.user import User
    from server.emergency_server.models.communication.emergency_contact import EmergencyContact
    from server.emergency_server.models.common.travel_history import TravelHistory
    from server.emergency_server.models.common.session import UserSession
    from server.emergency_server.models.emergency.emergency_log import EmergencyLog
    from server.emergency_server.models.biometric.palm_template import PalmTemplate
    Base.metadata.create_all(bind=sync_user_engine)


async def init_face_db():
    """Initialize the face recognition database and create tables"""
    from server.emergency_server.models.biometric.user_face import FaceBase, UserFace  # Import face-specific Base
    async with face_engine.begin() as conn:
        from pgvector.sqlalchemy import Vector  # Ensure pgvector is loaded
        from sqlalchemy import text
        # Enable pgvector extension
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        # Create tables
        await conn.run_sync(lambda conn: FaceBase.metadata.create_all(conn))