"""
Safety Alerts: Critical notifications for travel safety.

Features:
- Travel advisories (State Department warnings)
- Natural disaster alerts
- Health alerts (disease outbreaks)
- Security warnings
"""

import logging
import requests
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from enum import Enum
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class AlertSeverity(str, Enum):
    """Severity levels for safety alerts."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class AlertType(str, Enum):
    """Types of safety alerts."""
    TRAVEL_ADVISORY = "travel_advisory"
    NATURAL_DISASTER = "natural_disaster"
    HEALTH = "health"
    SECURITY = "security"
    WEATHER_EXTREME = "weather_extreme"


@dataclass
class SafetyAlert:
    """A safety alert for a destination."""
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    source: str
    issued_at: datetime
    expires_at: Optional[datetime] = None
    affected_regions: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None


class SafetyAlertMonitor:
    """
    Monitors and evaluates safety conditions for travel destinations.
    
    Data sources:
    - US State Department Travel Advisories API
    - GDACS (Global Disaster Alert and Coordination System)
    - WHO Disease Outbreak News
    - Weather extreme events
    """
    
    def __init__(self):
        self.cache: Dict[str, List[SafetyAlert]] = {}
        self.cache_ttl_minutes = 60
    
    async def check_destination_safety(
        self,
        country: str,
        city: Optional[str] = None,
    ) -> List[SafetyAlert]:
        """
        Check safety conditions for a destination.
        
        Returns:
            List of active safety alerts
        """
        alerts = []
        
        # Check travel advisories
        advisory_alerts = await self._check_travel_advisories(country)
        alerts.extend(advisory_alerts)
        
        # Check natural disasters
        disaster_alerts = await self._check_natural_disasters(country, city)
        alerts.extend(disaster_alerts)
        
        # Check health alerts
        health_alerts = await self._check_health_alerts(country)
        alerts.extend(health_alerts)
        
        return alerts
    
    async def _check_travel_advisories(self, country: str) -> List[SafetyAlert]:
        """
        Check US State Department travel advisories.
        
        API: https://travel.state.gov/_res/rss/TAsTWs.xml
        """
        alerts = []
        
        try:
            # Note: State Dept API requires parsing XML RSS feed
            # For production, integrate with official API or use third-party service
            
            # Placeholder implementation with mock data
            # TODO: Integrate with actual State Dept API
            
            # Example: High-risk countries
            high_risk_countries = ["AF", "SY", "YE", "IQ", "LY"]  # ISO codes
            if country.upper() in high_risk_countries:
                alerts.append(SafetyAlert(
                    alert_type=AlertType.TRAVEL_ADVISORY,
                    severity=AlertSeverity.CRITICAL,
                    title=f"Travel Advisory: {country}",
                    message=f"Do not travel to {country} due to security concerns.",
                    source="US State Department",
                    issued_at=datetime.now(timezone.utc),
                ))
        
        except Exception as e:
            logger.error(f"Failed to check travel advisories: {e}")
        
        return alerts
    
    async def _check_natural_disasters(
        self,
        country: str,
        city: Optional[str] = None,
    ) -> List[SafetyAlert]:
        """
        Check for active natural disasters.
        
        API: GDACS (https://www.gdacs.org/xml/rss.xml)
        """
        alerts = []
        
        try:
            # GDACS provides RSS feed of global disasters
            # For production, parse RSS or use their API
            
            # Placeholder: Check for recent earthquakes, floods, storms
            # TODO: Integrate with GDACS API
            
            pass
        
        except Exception as e:
            logger.error(f"Failed to check natural disasters: {e}")
        
        return alerts
    
    async def _check_health_alerts(self, country: str) -> List[SafetyAlert]:
        """
        Check for health alerts and disease outbreaks.
        
        API: WHO Disease Outbreak News or CDC Travel Health Notices
        """
        alerts = []
        
        try:
            # WHO provides outbreak data via their API
            # CDC has travel health notices API
            
            # Placeholder implementation
            # TODO: Integrate with WHO/CDC APIs
            
            pass
        
        except Exception as e:
            logger.error(f"Failed to check health alerts: {e}")
        
        return alerts
    
    def evaluate_alert_urgency(
        self,
        alerts: List[SafetyAlert],
        journey_departure_date: Optional[datetime] = None,
    ) -> tuple[bool, Optional[str]]:
        """
        Evaluate if alerts should block or warn about travel.
        
        Returns:
            (should_block, warning_message)
        """
        if not alerts:
            return False, None
        
        # Check for critical alerts
        critical = [a for a in alerts if a.severity == AlertSeverity.CRITICAL]
        if critical:
            messages = [f"⚠️ {a.title}: {a.message}" for a in critical]
            return True, "\n".join(messages)
        
        # Check for warnings
        warnings = [a for a in alerts if a.severity == AlertSeverity.WARNING]
        if warnings:
            messages = [f"⚠️ {a.title}: {a.message}" for a in warnings]
            return False, "\n".join(messages)
        
        return False, None


# Singleton instance
_monitor = SafetyAlertMonitor()


async def check_destination_safety(
    country: str,
    city: Optional[str] = None,
) -> List[SafetyAlert]:
    """
    Check safety conditions for a destination.
    
    Usage:
        alerts = await check_destination_safety("Syria", "Damascus")
        if alerts:
            for alert in alerts:
                if alert.severity == AlertSeverity.CRITICAL:
                    notify_user(alert.message)
    """
    return await _monitor.check_destination_safety(country, city)


async def evaluate_journey_safety(
    journey_context: Dict[str, Any],
) -> tuple[bool, Optional[str], List[SafetyAlert]]:
    """
    Evaluate safety for an entire journey.
    
    Returns:
        (should_block, warning_message, all_alerts)
    """
    destination = journey_context.get("planned_destination") or journey_context.get("destination_city")
    country = journey_context.get("destination_country")
    
    if not country:
        return False, None, []
    
    alerts = await check_destination_safety(country, destination)
    should_block, warning = _monitor.evaluate_alert_urgency(
        alerts,
        journey_context.get("planned_departure_date"),
    )
    
    return should_block, warning, alerts
