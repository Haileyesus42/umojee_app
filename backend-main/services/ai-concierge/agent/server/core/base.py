from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
 
class BaseAgent(ABC):
    """Base interface for all AI agents"""
    
    @abstractmethod
    def initialize(self, config: Dict[str, Any] = None) -> bool:
        """Initialize the agent with configuration"""
        pass
    
    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Check agent health and readiness"""
        pass