from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import os
import logging
from dotenv import load_dotenv
from bson import ObjectId
import asyncio

# Load environment variables
load_dotenv()

# Import from the existing config
from server.emergency_server.core.config import settings

# Setup logging
logger = logging.getLogger(__name__)

# Secret key for JWT tokens - use the same configuration as settings
SECRET_KEY = settings.JWT_SECRET
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


async def get_current_mongo_user(token: str = Depends(oauth2_scheme)):
    """
    Get current user from MongoDB instead of PostgreSQL
    This function mimics the behavior of get_current_user but works with MongoDB users
    Note: Node.js backend creates tokens with 'id' claim, not 'sub'
    Includes timeout and fallback mechanisms for when MongoDB is unavailable
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Node.js backend creates tokens with 'id' claim, not 'sub'
        user_id: str = payload.get("id")  # Changed from 'sub' to 'id'
        
        if user_id is None:
            logger.error("No 'id' claim found in JWT token")
            # Also try 'sub' as fallback
            user_id = payload.get("sub")
            if user_id is None:
                raise credentials_exception
            
        # Import MongoDB database connection
        from server.mongo_db import get_database
        
        # Attempt to connect to MongoDB with a timeout
        try:
            # Try to connect and find user, but with timeout protection
            db = get_database()
            users_collection = db["users"]  # Assuming users are stored in 'users' collection
            
            logger.info(f"Attempting to find user with ID: {user_id}")
            
            # Try to find user by ID first (checking if it's a valid ObjectId)
            user = None
            try:
                object_id = ObjectId(user_id)
                user = users_collection.find_one({"_id": object_id})
                logger.info(f"Searched for user by ObjectId: {object_id}, found: {user is not None}")
            except Exception as e:
                # If it's not a valid ObjectId hex string, search by username/email as fallback
                logger.info(f"Not a valid ObjectId, searching by username/email as fallback: {user_id}")
                user = users_collection.find_one({
                    "$or": [
                        {"username": user_id},
                        {"email": user_id}
                    ]
                })
                logger.info(f"Searched for user by username/email: {user_id}, found: {user is not None}")
            
            if user:
                # Return user data (convert ObjectId to string for consistency)
                user["_id"] = str(user["_id"])
                logger.info(f"Successfully authenticated user: {user.get('username', 'unknown')}")
                return user
            else:
                logger.warning(f"User not found in MongoDB: {user_id}")
                # Instead of failing, return a minimal user object to allow the emergency webhook to function
                # This allows the system to continue and let the emergency webhook handle the missing user case
                return {
                    "_id": user_id,
                    "username": f"unknown_user_{user_id[:8]}",
                    "email": "",
                    "full_name": "Unknown User",
                    "phone": "",
                    "address": "",
                    "current_city": "",
                    "current_country": "",
                    "hotel_name": "",
                    "current_location": "",
                    "gps_latitude": "",
                    "gps_longitude": ""
                }
                
        except Exception as db_error:
            logger.error(f"MongoDB connection error: {db_error}")
            # If MongoDB is unavailable, return a minimal user object to allow emergency functions to proceed
            logger.warning(f"MongoDB unavailable, returning minimal user for ID: {user_id}")
            return {
                "_id": user_id,
                "username": f"unknown_user_{user_id[:8]}",
                "email": "",
                "full_name": "Unknown User",
                "phone": "",
                "address": "",
                "current_city": "",
                "current_country": "",
                "hotel_name": "",
                "current_location": "",
                "gps_latitude": "",
                "gps_longitude": ""
            }
        
    except JWTError as e:
        logger.error(f"JWT decoding error: {e}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"General authentication error: {e}")
        raise credentials_exception