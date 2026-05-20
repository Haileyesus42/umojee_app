import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
AI_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SQLITE_PATH = AI_ROOT / "ai_data.db"

load_dotenv(AI_ROOT / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}")

# Build engine with graceful fallback (e.g., when pyodbc driver is missing locally)
def _mk_engine(url: str):
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, pool_pre_ping=True, connect_args=connect_args)

try:
    engine = _mk_engine(DATABASE_URL)
except Exception:
    engine = _mk_engine(f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}")

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()
