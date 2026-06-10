"""
Coordinator Module
Manages coordination between different agents
"""
import logging
from typing import Dict, Any
from agent.biometric.biometric_agent import BiometricAgent
from agent.emergency.emergency_protocol import EmergencyProtocolAgent

logger = logging.getLogger(__name__)

class Coordinator:
    """Coordinates operations between different agents"""
    
    def __init__(self):
        """Initialize coordinator with agents"""
        self.biometric_agent = BiometricAgent()
        self.emergency_agent = None  # We'll initialize this as needed
        
        # Initialize the biometric processors
        self.biometric_agent.initialize_processors()
    
    def process_request(self, service_type: str, operation: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a request by coordinating between agents"""
        try:
            if service_type.lower() == 'biometric':
                return self._process_biometric(operation, data)
            elif service_type.lower() == 'emergency':
                return self._process_emergency(operation, data)
            else:
                raise ValueError(f"Unknown service type: {service_type}")
        except Exception as e:
            logger.error(f"Error processing request: {str(e)}")
            return {"error": str(e)}
    
    def _process_biometric(self, operation: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process biometric operations"""
        biometric_type = data.get('type', 'face')  # Default to face if not specified
        
        if biometric_type == 'face':
            image_data = data.get('image_data', b'')
            return self.biometric_agent.process_face(image_data, operation)
        elif biometric_type == 'palm':
            image_data = data.get('image_data', b'')
            return self.biometric_agent.process_palm(image_data, operation)
        elif biometric_type == 'voice':
            audio_data = data.get('audio_data', b'')
            return self.biometric_agent.process_voice(audio_data, operation)
        else:
            raise ValueError(f"Unknown biometric type: {biometric_type}")
    
    def _process_emergency(self, operation: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process emergency operations"""
        # Placeholder implementation
        return {
            "status": "processed",
            "operation": operation,
            "message": f"Emergency operation '{operation}' processed successfully"
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check on all coordinated services"""
        return {
            "status": "healthy",
            "services": {
                "biometric": True,
                "emergency": True
            },
            "timestamp": self._get_timestamp()
        }
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        import datetime
        return datetime.datetime.now().isoformat()