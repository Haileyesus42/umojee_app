"""
User-friendly error handler: Convert technical errors to helpful messages.

Transforms generic API errors into actionable user guidance.
"""

import logging
from typing import Dict, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class ErrorCategory(str, Enum):
    """Categories of errors for user-friendly messaging."""
    API_UNAVAILABLE = "api_unavailable"
    API_TIMEOUT = "api_timeout"
    NO_RESULTS = "no_results"
    INVALID_INPUT = "invalid_input"
    RATE_LIMIT = "rate_limit"
    AUTHENTICATION = "authentication"
    BOOKING_FAILED = "booking_failed"
    NETWORK = "network"
    UNKNOWN = "unknown"


class UserFriendlyError:
    """User-friendly error message with suggestions."""
    
    def __init__(
        self,
        category: ErrorCategory,
        message: str,
        suggestions: Optional[List[str]] = None,
        technical_details: Optional[str] = None,
    ):
        self.category = category
        self.message = message
        self.suggestions = suggestions or []
        self.technical_details = technical_details
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "category": self.category.value,
            "message": self.message,
            "suggestions": self.suggestions,
            "technical_details": self.technical_details,
        }
    
    def format_for_user(self) -> str:
        """Format as user-facing message."""
        parts = [self.message]
        if self.suggestions:
            parts.append("\n\n**Suggestions:**")
            for i, suggestion in enumerate(self.suggestions, 1):
                parts.append(f"{i}. {suggestion}")
        return "\n".join(parts)


class ErrorHandler:
    """
    Converts technical errors into user-friendly messages with actionable suggestions.
    """
    
    # Error pattern matching
    ERROR_PATTERNS = {
        # API availability
        r"connection.*refused|service.*unavailable|502|503|504": ErrorCategory.API_UNAVAILABLE,
        r"timeout|timed out|deadline exceeded": ErrorCategory.API_TIMEOUT,
        r"rate limit|too many requests|429": ErrorCategory.RATE_LIMIT,
        r"unauthorized|401|403|invalid.*key|authentication": ErrorCategory.AUTHENTICATION,
        
        # Search results
        r"no.*found|0 results|empty.*response|no.*available": ErrorCategory.NO_RESULTS,
        
        # Input validation
        r"invalid.*input|missing.*parameter|required.*field|validation.*error": ErrorCategory.INVALID_INPUT,
        
        # Booking
        r"booking.*failed|reservation.*failed|sold out|no.*availability": ErrorCategory.BOOKING_FAILED,
        
        # Network
        r"network.*error|dns.*error|connection.*error": ErrorCategory.NETWORK,
    }
    
    def categorize_error(self, error_message: str) -> ErrorCategory:
        """Categorize error based on message content."""
        import re
        error_lower = error_message.lower()
        
        for pattern, category in self.ERROR_PATTERNS.items():
            if re.search(pattern, error_lower):
                return category
        
        return ErrorCategory.UNKNOWN
    
    def handle_error(
        self,
        error: Exception,
        context: Optional[Dict[str, Any]] = None,
    ) -> UserFriendlyError:
        """
        Convert exception to user-friendly error.
        
        Args:
            error: The exception that occurred
            context: Additional context (operation, service, user_input)
        
        Returns:
            UserFriendlyError with message and suggestions
        """
        error_msg = str(error)
        category = self.categorize_error(error_msg)
        context = context or {}
        
        operation = context.get("operation", "operation")
        service = context.get("service", "service")
        user_input = context.get("user_input", {})
        
        # Generate user-friendly message based on category
        if category == ErrorCategory.API_UNAVAILABLE:
            return UserFriendlyError(
                category=category,
                message=f"{service} is temporarily unavailable. We're working to restore it.",
                suggestions=[
                    "Try again in a few minutes",
                    "Use alternative search criteria (different dates or locations)",
                    "Contact support if the issue persists",
                ],
                technical_details=error_msg,
            )
        
        elif category == ErrorCategory.API_TIMEOUT:
            return UserFriendlyError(
                category=category,
                message=f"{service} is taking longer than usual to respond.",
                suggestions=[
                    "Try again with a shorter date range",
                    "Simplify your search criteria",
                    "Check your internet connection",
                ],
                technical_details=error_msg,
            )
        
        elif category == ErrorCategory.NO_RESULTS:
            suggestions = self._generate_no_results_suggestions(operation, user_input)
            return UserFriendlyError(
                category=category,
                message=f"No {operation} found matching your criteria.",
                suggestions=suggestions,
                technical_details=error_msg,
            )
        
        elif category == ErrorCategory.INVALID_INPUT:
            return UserFriendlyError(
                category=category,
                message="Some information is missing or incorrect.",
                suggestions=[
                    "Check that all dates are in the future",
                    "Verify city names are spelled correctly",
                    "Ensure all required fields are filled",
                ],
                technical_details=error_msg,
            )
        
        elif category == ErrorCategory.RATE_LIMIT:
            return UserFriendlyError(
                category=category,
                message="We've made too many requests recently. Taking a short break.",
                suggestions=[
                    "Wait 1-2 minutes before trying again",
                    "Combine multiple searches into one request",
                ],
                technical_details=error_msg,
            )
        
        elif category == ErrorCategory.BOOKING_FAILED:
            return UserFriendlyError(
                category=category,
                message="This option is no longer available.",
                suggestions=[
                    "Try a different flight/hotel/car",
                    "Search for alternative dates",
                    "Check nearby airports or cities",
                ],
                technical_details=error_msg,
            )
        
        elif category == ErrorCategory.NETWORK:
            return UserFriendlyError(
                category=category,
                message="Network connection issue detected.",
                suggestions=[
                    "Check your internet connection",
                    "Try again in a moment",
                    "Switch to a different network if available",
                ],
                technical_details=error_msg,
            )
        
        else:
            return UserFriendlyError(
                category=ErrorCategory.UNKNOWN,
                message="Something went wrong. Our team has been notified.",
                suggestions=[
                    "Try rephrasing your request",
                    "Refresh the page and try again",
                    "Contact support if the issue continues",
                ],
                technical_details=error_msg,
            )
    
    def _generate_no_results_suggestions(
        self,
        operation: str,
        user_input: Dict[str, Any],
    ) -> List[str]:
        """Generate contextual suggestions for no results."""
        suggestions = []
        
        if "flight" in operation.lower():
            suggestions.extend([
                "Try flexible dates (±3 days)",
                "Check nearby airports",
                "Consider connecting flights instead of direct",
            ])
            if user_input.get("departure_date"):
                suggestions.append("Try a different month or season")
        
        elif "hotel" in operation.lower():
            suggestions.extend([
                "Expand your search radius",
                "Try different check-in/check-out dates",
                "Consider nearby neighborhoods or cities",
            ])
            if user_input.get("max_price"):
                suggestions.append("Increase your budget range")
        
        elif "car" in operation.lower():
            suggestions.extend([
                "Try a different pickup location",
                "Adjust rental dates",
                "Consider alternative vehicle types",
            ])
        
        return suggestions


# Singleton instance
_error_handler = ErrorHandler()


def handle_error(
    error: Exception,
    operation: str = "operation",
    service: str = "service",
    user_input: Optional[Dict[str, Any]] = None,
) -> UserFriendlyError:
    """
    Main entry point for error handling.
    
    Usage:
        try:
            result = await search_flights(...)
        except Exception as e:
            friendly = handle_error(e, operation="flight search", service="Amadeus", user_input={"origin": "NYC"})
            return {"error": friendly.format_for_user()}
    """
    return _error_handler.handle_error(error, {
        "operation": operation,
        "service": service,
        "user_input": user_input or {},
    })


def format_api_error(error: Exception, context: str = "") -> str:
    """Quick helper to format API errors for user display."""
    friendly = handle_error(error, operation=context)
    return friendly.format_for_user()
