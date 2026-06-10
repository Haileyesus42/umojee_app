from sqlalchemy.orm import Session
from ...models.common.user import User
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from ..config import settings
import os

# 创建数据库引擎
engine = create_engine(settings.USER_DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class UserRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_username(self, username: str):
        return self.db.query(User).filter(User.username == username).first()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session

from ...models.common.user import User
from ..database.database import get_user_db

# Secret key for JWT tokens - use the same configuration as settings
SECRET_KEY = settings.JWT_SECRET
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# No need for CryptContext; using bcrypt directly

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    try:
        # Truncate plain password to 72 characters before verifying to comply with bcrypt limits
        truncated_password = plain_password[:72] if len(plain_password) > 72 else plain_password
        # Ensure the hashed password is properly formatted for bcrypt
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
        if isinstance(truncated_password, str):
            truncated_password = truncated_password.encode('utf-8')
        return bcrypt.checkpw(truncated_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password):
    # Truncate password to 72 characters before hashing to comply with bcrypt limits
    truncated_password = password[:72] if len(password) > 72 else password
    try:
        if isinstance(truncated_password, str):
            truncated_password = truncated_password.encode('utf-8')
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(truncated_password, salt).decode('utf-8')
    except Exception as e:
        raise ValueError(f"Password hashing failed: {str(e)}")

def authenticate_user(db: Session, username: str, password: str):
    user_repo = UserRepository(db)
    user = user_repo.get_by_username(username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_user_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user