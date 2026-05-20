"""
Location Geofencing: Fuzzy location triggers with multiple proximity zones.

Features:
- Multi-zone geofencing (approaching, nearby, arrived)
- Distance-based notifications
- ETA calculations with traffic
- Predictive arrival notifications
"""

import logging
import math
import os
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone, timedelta
from enum import Enum
from dataclasses import dataclass

logger = logging.getLogger(__name__)


def _get_env_distance_meters(name: str, default_meters: float) -> float:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default_meters

    try:
        kilometers = float(raw_value)
        if kilometers <= 0:
            raise ValueError("distance must be positive")
        return kilometers * 1000
    except (TypeError, ValueError):
        logger.warning(
            "Invalid %s=%r. Falling back to %.2f km.",
            name,
            raw_value,
            default_meters / 1000,
        )
        return default_meters


class ProximityZone(str, Enum):
    """Proximity zones for geofencing."""
    FAR = "far"  # > 5 km
    APPROACHING = "approaching"  # 2-5 km
    NEARBY = "nearby"  # 0.5-2 km
    ARRIVED = "arrived"  # < 0.5 km


@dataclass
class LocationStatus:
    """Current location status relative to waypoint."""
    zone: ProximityZone
    distance_meters: float
    distance_km: float
    eta_minutes: Optional[int]
    should_notify: bool
    notification_message: Optional[str]


class LocationGeofencing:
    """
    Handles fuzzy location-based triggers with multiple proximity zones.
    
    Instead of exact 500m threshold, uses graduated zones:
    - Approaching (2-5 km): "You're 3 km from the airport. ETA 15 minutes."
    - Nearby (0.5-2 km): "You're nearby. Traffic is light."
    - Arrived (< 0.5 km): "You've arrived at the airport."
    """
    
    # Zone thresholds in meters
    ZONE_THRESHOLDS = {
        ProximityZone.ARRIVED: _get_env_distance_meters(
            "JOURNEY_GEOFENCE_ARRIVED_KM", 500
        ),
        ProximityZone.NEARBY: _get_env_distance_meters(
            "JOURNEY_GEOFENCE_NEARBY_KM", 2000
        ),
        ProximityZone.APPROACHING: _get_env_distance_meters(
            "JOURNEY_GEOFENCE_APPROACHING_KM", 5000
        ),
    }
    
    def __init__(self):
        self.last_notifications: Dict[str, Dict[str, datetime]] = {}  # journey_id -> {zone -> timestamp}
    
    def calculate_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
    ) -> float:
        """
        Calculate distance between two coordinates using Haversine formula.
        
        Returns:
            Distance in meters
        """
        R = 6371000  # Earth radius in meters
        
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        
        a = (
            math.sin(delta_phi / 2) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    def determine_zone(self, distance_meters: float) -> ProximityZone:
        """Determine proximity zone based on distance."""
        if distance_meters < self.ZONE_THRESHOLDS[ProximityZone.ARRIVED]:
            return ProximityZone.ARRIVED
        elif distance_meters < self.ZONE_THRESHOLDS[ProximityZone.NEARBY]:
            return ProximityZone.NEARBY
        elif distance_meters < self.ZONE_THRESHOLDS[ProximityZone.APPROACHING]:
            return ProximityZone.APPROACHING
        else:
            return ProximityZone.FAR
    
    def calculate_eta(
        self,
        distance_meters: float,
        traffic_data: Optional[Dict[str, Any]] = None,
    ) -> Optional[int]:
        """
        Calculate ETA in minutes based on distance and traffic.
        
        Args:
            distance_meters: Distance to destination
            traffic_data: Current traffic conditions
        
        Returns:
            ETA in minutes
        """
        # Base speed assumptions
        if distance_meters < 1000:
            # Walking speed for very short distances
            base_speed_kmh = 5
        else:
            # Driving speed
            base_speed_kmh = 40  # Urban average
        
        # Adjust for traffic
        if traffic_data:
            delay_minutes = traffic_data.get("delay_minutes", 0)
            conditions = (traffic_data.get("conditions") or "").lower()
            
            if "heavy" in conditions or delay_minutes > 20:
                base_speed_kmh *= 0.5  # 50% slower
            elif "moderate" in conditions or delay_minutes > 10:
                base_speed_kmh *= 0.7  # 30% slower
        
        # Calculate ETA
        distance_km = distance_meters / 1000
        eta_hours = distance_km / base_speed_kmh
        eta_minutes = int(eta_hours * 60)
        
        return max(1, eta_minutes)  # At least 1 minute
    
    def should_notify_for_zone(
        self,
        journey_id: str,
        zone: ProximityZone,
        cooldown_minutes: int = 10,
    ) -> bool:
        """
        Check if we should send notification for this zone (avoid spam).
        
        Args:
            journey_id: Journey identifier
            zone: Current proximity zone
            cooldown_minutes: Minimum time between notifications for same zone
        
        Returns:
            True if notification should be sent
        """
        if journey_id not in self.last_notifications:
            return True
        
        zone_history = self.last_notifications[journey_id]
        if zone.value not in zone_history:
            return True
        
        last_sent = zone_history[zone.value]
        elapsed = (datetime.now(timezone.utc) - last_sent).total_seconds() / 60
        
        return elapsed >= cooldown_minutes
    
    def mark_notification_sent(self, journey_id: str, zone: ProximityZone) -> None:
        """Mark that notification was sent for this zone."""
        if journey_id not in self.last_notifications:
            self.last_notifications[journey_id] = {}
        self.last_notifications[journey_id][zone.value] = datetime.now(timezone.utc)
    
    def evaluate_location(
        self,
        journey_id: str,
        current_lat: float,
        current_lon: float,
        waypoint_lat: float,
        waypoint_lon: float,
        waypoint_name: str,
        traffic_data: Optional[Dict[str, Any]] = None,
    ) -> LocationStatus:
        """
        Evaluate user's location relative to waypoint.
        
        Returns:
            LocationStatus with zone, distance, ETA, and notification details
        """
        distance = self.calculate_distance(current_lat, current_lon, waypoint_lat, waypoint_lon)
        zone = self.determine_zone(distance)
        eta = self.calculate_eta(distance, traffic_data)
        
        # Generate notification message
        notification_message = None
        should_notify = False
        
        if zone == ProximityZone.ARRIVED:
            if self.should_notify_for_zone(journey_id, zone):
                notification_message = f"You've arrived at {waypoint_name}."
                should_notify = True
        
        elif zone == ProximityZone.NEARBY:
            if self.should_notify_for_zone(journey_id, zone):
                traffic_note = ""
                if traffic_data:
                    conditions = traffic_data.get("conditions", "").lower()
                    if "heavy" in conditions:
                        traffic_note = " Traffic is heavy."
                    elif "light" in conditions:
                        traffic_note = " Traffic is light."
                
                notification_message = (
                    f"You're nearby {waypoint_name} ({distance / 1000:.1f} km).{traffic_note}"
                )
                should_notify = True
        
        elif zone == ProximityZone.APPROACHING:
            if self.should_notify_for_zone(journey_id, zone, cooldown_minutes=15):
                eta_text = f"ETA {eta} minutes" if eta else "Approaching"
                notification_message = (
                    f"You're {distance / 1000:.1f} km from {waypoint_name}. {eta_text}."
                )
                should_notify = True
        
        return LocationStatus(
            zone=zone,
            distance_meters=distance,
            distance_km=distance / 1000,
            eta_minutes=eta,
            should_notify=should_notify,
            notification_message=notification_message,
        )


# Singleton instance
_geofencing = LocationGeofencing()


def evaluate_user_location(
    journey_id: str,
    current_lat: float,
    current_lon: float,
    waypoint_lat: float,
    waypoint_lon: float,
    waypoint_name: str,
    traffic_data: Optional[Dict[str, Any]] = None,
) -> LocationStatus:
    """
    Evaluate user's location and generate appropriate notification.
    
    Usage:
        status = evaluate_user_location(
            journey_id="123",
            current_lat=40.7128,
            current_lon=-74.0060,
            waypoint_lat=40.6413,
            waypoint_lon=-73.7781,
            waypoint_name="JFK Airport",
            traffic_data=monitoring.get("traffic"),
        )
        
        if status.should_notify:
            send_notification(status.notification_message)
        
        if status.zone == ProximityZone.ARRIVED:
            trigger_segment_transition()
    """
    status = _geofencing.evaluate_location(
        journey_id, current_lat, current_lon,
        waypoint_lat, waypoint_lon, waypoint_name,
        traffic_data,
    )
    
    if status.should_notify:
        _geofencing.mark_notification_sent(journey_id, status.zone)
    
    return status
