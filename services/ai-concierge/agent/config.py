import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


class LLMConfig:
    """Centralized LLM configuration"""
    
    # LLM Provider: "groq" or "openai"
    PROVIDER: str = os.getenv("LLM_PROVIDER", "groq").lower()
    
    # Model configuration
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")
    
    # Temperature
    TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.1"))
    
    # Timeout and retries (for Groq)
    TIMEOUT: Optional[int] = int(os.getenv("LLM_TIMEOUT", "0")) or None
    MAX_RETRIES: int = int(os.getenv("LLM_MAX_RETRIES", "2"))
    
    # Max tokens (None means no limit)
    MAX_TOKENS: Optional[int] = int(os.getenv("LLM_MAX_TOKENS", "0")) or None
    
    @classmethod
    def get_llm(cls):
        """Factory method to create and return the configured LLM instance"""
        if cls.PROVIDER == "groq":
            from langchain_groq import ChatGroq
            return ChatGroq(
                model=cls.GROQ_MODEL,
                temperature=cls.TEMPERATURE,
                timeout=cls.TIMEOUT,
                max_retries=cls.MAX_RETRIES,
                max_tokens=cls.MAX_TOKENS,
            )
        elif cls.PROVIDER == "openai":
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=cls.OPENAI_MODEL,
                temperature=cls.TEMPERATURE,
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {cls.PROVIDER}. Use 'groq' or 'openai'")
    
    @classmethod
    def get_llm_for_tools(cls, model: Optional[str] = None, temperature: float = 0):
        """Create an LLM instance specifically for tools (with default temperature=0)"""
        if cls.PROVIDER == "groq":
            from langchain_groq import ChatGroq
            return ChatGroq(
                model=model or cls.GROQ_MODEL,
                temperature=temperature,
                timeout=cls.TIMEOUT,
                max_retries=cls.MAX_RETRIES,
                max_tokens=cls.MAX_TOKENS,
            )
        elif cls.PROVIDER == "openai":
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=model or cls.OPENAI_MODEL,
                temperature=temperature,
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {cls.PROVIDER}. Use 'groq' or 'openai'")


class TravelProviderConfig:
    """Centralized travel workflow provider configuration."""

    PROVIDER: str = os.getenv("AI_TRAVEL_PROVIDER", "amadeus").strip().lower()
    SUPPORTED_PROVIDERS = {"amadeus", "duffel"}

    @classmethod
    def get_provider(cls) -> str:
        provider = cls.PROVIDER or "amadeus"
        if provider not in cls.SUPPORTED_PROVIDERS:
            return "amadeus"
        return provider


# Global LLM instance
llm = LLMConfig.get_llm()

