import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    # Vapi API Configuration
    VAPI_API_KEY = os.getenv("VAPI_API_KEY")
    VAPI_ASSISTANT_ID = os.getenv("VAPI_ASSISTANT_ID")
    VAPI_PHONE_NUMBER_ID = os.getenv("VAPI_PHONE_NUMBER_ID")
    
    # Dograh API Configuration
    DOGRAH_API_KEY = os.getenv("DOGRAH_API_KEY")
    DOGRAH_AGENT_UUID = os.getenv("DOGRAH_AGENT_UUID")
    
    # Twilio Configuration
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
    TWILIO_MESSAGING_SERVICE_SID = os.getenv("TWILIO_MESSAGING_SERVICE_SID")
    
    # JWT Configuration
    JWT_SECRET = os.getenv("JWT_SECRET", "default_secret")
    
    # Database Configuration
    USER_DB_URL = os.getenv("USER_DB_URL", os.getenv("DATABASE_URL", "postgresql+asyncpg://face_user:Dingle100%25143@localhost/face_recognition"))
    FACE_DB_URL = os.getenv("FACE_DB_URL", os.getenv("DATABASE_URL", "postgresql+asyncpg://face_user:Dingle100%25143@localhost/face_recognition"))
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://username:password@localhost/database_name")
    
    # Model Configuration
    MODEL_PATH = os.getenv("MODEL_PATH", "services/ai_concierge/models/adaface_ir18.onnx")
    EMBEDDING_SIZE = int(os.getenv("EMBEDDING_SIZE", "512"))
    IMAGE_SIZE = tuple(map(int, os.getenv("IMAGE_SIZE", "160,160").split(",")))
    FACE_DETECTION_THRESHOLD = float(os.getenv("FACE_DETECTION_THRESHOLD", "0.7"))
    
    PROJECT_NAME = os.getenv("PROJECT_NAME", "AI Concierge Service")

settings = Settings()