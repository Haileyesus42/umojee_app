"""
Emergency Alert Processing Module
"""
import os
import json
from typing import Dict, Any, List
import logging
import datetime

logger = logging.getLogger(__name__)

class AlertProcessor:
    """Emergency alert processing functionality"""
    
    def __init__(self):
        """Initialize alert processor"""
        self.active_alerts = {}
        logger.info("Alert processor initialized")
    
    def process_alert(self, operation: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process emergency operations"""
        try:
            if operation == "trigger":
                return self.trigger_alert(data)
            elif operation == "cancel":
                return self.cancel_alert(data)
            elif operation == "status":
                return self.get_alert_status(data)
            elif operation == "history":
                return self.get_alert_history(data)
            elif operation == "coordinates":
                return self.process_coordinates(data)
            else:
                raise ValueError(f"Unknown emergency operation: {operation}")
        except Exception as e:
            logger.error(f"Error processing emergency operation: {str(e)}")
            raise
    
    def trigger_alert(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger an emergency alert"""
        user_id = data.get('user_id', '')
        alert_type = data.get('alert_type', 'sos')
        coordinates = data.get('coordinates', {})
        message = data.get('message', 'Emergency alert triggered')
        
        # Generate alert ID
        alert_id = self._generate_alert_id()
        
        # Store alert information
        self.active_alerts[alert_id] = {
            'user_id': user_id,
            'alert_type': alert_type,
            'coordinates': coordinates,
            'message': message,
            'timestamp': self._get_timestamp(),
            'status': 'active'
        }
        
        logger.info(f"Emergency alert triggered: {alert_id} for user {user_id}")
        
        return {
            "alert_id": alert_id,
            "status": "triggered",
            "user_id": user_id,
            "alert_type": alert_type,
            "coordinates": coordinates,
            "message": message,
            "timestamp": self._get_timestamp()
        }
    
    def cancel_alert(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Cancel an active emergency alert"""
        alert_id = data.get('alert_id', '')
        
        if alert_id in self.active_alerts:
            self.active_alerts[alert_id]['status'] = 'cancelled'
            self.active_alerts[alert_id]['cancelled_at'] = self._get_timestamp()
            
            logger.info(f"Emergency alert cancelled: {alert_id}")
            
            return {
                "alert_id": alert_id,
                "status": "cancelled",
                "cancelled_at": self._get_timestamp()
            }
        else:
            return {
                "alert_id": alert_id,
                "status": "not_found",
                "message": "Alert not found or already cancelled"
            }
    
    def get_alert_status(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Get status of an emergency alert"""
        alert_id = data.get('alert_id', '')
        
        if alert_id in self.active_alerts:
            alert_info = self.active_alerts[alert_id].copy()
            return {
                "alert_id": alert_id,
                "status": "found",
                "info": alert_info
            }
        else:
            return {
                "alert_id": alert_id,
                "status": "not_found",
                "message": "Alert not found"
            }
    
    def get_alert_history(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Get emergency alert history"""
        user_id = data.get('user_id', '')
        limit = data.get('limit', 10)
        alert_type_filter = data.get('alert_type', None)
        
        # Filter alerts based on criteria
        filtered_alerts = []
        for alert_id, alert_data in self.active_alerts.items():
            if user_id and alert_data['user_id'] != user_id:
                continue
            if alert_type_filter and alert_data['alert_type'] != alert_type_filter:
                continue
            filtered_alerts.append({
                'alert_id': alert_id,
                **alert_data
            })
        
        # Sort by timestamp and limit results
        filtered_alerts.sort(key=lambda x: x['timestamp'], reverse=True)
        recent_alerts = filtered_alerts[:limit]
        
        return {
            "user_id": user_id,
            "alerts": recent_alerts,
            "count": len(recent_alerts),
            "limit": limit,
            "filter": {
                "alert_type": alert_type_filter
            }
        }
    
    def process_coordinates(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process coordinates for emergency services"""
        coordinates = data.get('coordinates', {})
        accuracy = data.get('accuracy', 10.0)  # meters
        
        # Validate coordinates
        lat = coordinates.get('latitude')
        lon = coordinates.get('longitude')
        
        if lat is None or lon is None:
            raise ValueError("Latitude and longitude are required")
        
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            raise ValueError("Invalid coordinate values")
        
        # Simulate processing coordinates
        logger.info(f"Processing coordinates: {lat}, {lon}")
        
        return {
            "status": "processed",
            "coordinates": {
                "latitude": lat,
                "longitude": lon,
                "accuracy_meters": accuracy
            },
            "processed_at": self._get_timestamp(),
            "location_details": {
                "country": "Unknown",
                "city": "Unknown",
                "address": "Coordinates received"
            }
        }
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        return datetime.datetime.now().isoformat()
    
    def _generate_alert_id(self) -> str:
        """Generate a unique alert ID"""
        import uuid
        return f"alert_{str(uuid.uuid4())[:8]}"