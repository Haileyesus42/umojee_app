# Emergency Webhook Authentication System Documentation

## Overview
This document describes the implementation of the emergency webhook authentication system that enables secure communication between the Node.js gateway and the Python AI concierge service. The system addresses cross-service authentication challenges between services using different databases (MongoDB and PostgreSQL).

## Problem Statement
The original emergency webhook had several authentication issues:
1. **JWT Secret Mismatch**: Node.js and Python services used different JWT secrets
2. **JWT Claim Mismatch**: Services looked for different claims in the JWT token
3. **Database Mismatch**: Authentication used PostgreSQL while users are stored in MongoDB
4. **Missing User Data**: Emergency contacts were not properly retrieved from the Node.js service
5. **Insufficient Response Data**: Responses did not include user information

## Solution Architecture

### 1. JWT Authentication Fix
The system now ensures consistent JWT handling between services:
- **Node.js Gateway** creates tokens with `{ id: user._id }` payload
- **Python Service** validates tokens using the same JWT secret
- **MongoDB Lookup** authenticates users from MongoDB collection

### 2. Cross-Service Data Flow
```
Node.js Gateway → JWT Token → Python Emergency Webhook → MongoDB User Validation → Node.js Emergency Contacts → Emergency Processing
```

### 3. Emergency Contact Retrieval
The Python service now calls back to the Node.js service to retrieve emergency contacts:
- Fetches contacts via authenticated API call to Node.js service
- Properly handles contact priority and organization
- Processes both primary and secondary contacts

## Key Components

### auth_mongo.py
Handles MongoDB-based authentication for the emergency webhook:
```python
async def get_current_mongo_user(token: str = Depends(oauth2_scheme)):
    """
    Get current user from MongoDB instead of PostgreSQL
    This function mimics the behavior of get_current_user but works with MongoDB users
    Note: Node.js backend creates tokens with 'id' claim, not 'sub'
    """
```

### server/main.py (Emergency Webhook)
The enhanced emergency webhook endpoint:
- Validates JWT tokens against MongoDB users
- Retrieves emergency contacts from Node.js service
- Processes emergency calls via Dograh service
- Provides fallback to WhatsApp notifications
- Returns detailed user information in response

## Implementation Details

### JWT Configuration Alignment
- **Secret**: Both services now use the same JWT secret
- **Algorithm**: HS256 algorithm maintained for consistency
- **Claims**: Correctly handles `{ id: user._id }` claim from Node.js

### Database Integration
- **Authentication**: MongoDB user validation
- **Emergency Contacts**: Retrieved from Node.js service via API call
- **Fallback**: Graceful handling when MongoDB is unavailable

### Enhanced Response Format
The emergency webhook now returns detailed information:
```json
{
  "status": "success",
  "message": "Emergency signal received and processed",
  "user_found": true,
  "user_info": {
    "id": "mongo_user_id",
    "name": "User Full Name",
    "email": "user@example.com",
    "phone": "+1234567890",
    "current_location": "City, Country",
    "address": "User Address",
    "hotel": "Hotel Name"
  },
  "contact_info": {
    "primary": {
      "name": "Primary Contact",
      "relationship": "Relationship",
      "phone": "+1234567890",
      "whatsapp": "+1234567890"
    },
    "secondary": {
      "name": "Secondary Contact",
      "relationship": "Relationship",
      "phone": "+1234567890",
      "whatsapp": "+1234567890"
    }
  },
  "emergency_details": {
    "signal_type": "sos",
    "timestamp": "ISO timestamp"
  }
}
```

## Security Considerations

### Authentication Flow
1. JWT token extracted from Authorization header
2. Token validated against MongoDB users using correct claims
3. Emergency contacts retrieved via authenticated API call to Node.js
4. All sensitive operations protected by proper authentication

### Error Handling
- Invalid tokens return 401 Unauthorized
- Missing emergency contacts handled gracefully
- Database connection issues have fallback mechanisms
- Missing Dograh configuration triggers WhatsApp fallback

## Environment Variables
Required environment variables in `.env`:
- `JWT_SECRET`: Shared secret for JWT validation
- `NODEJS_GATEWAY_URL`: URL of Node.js service for contact retrieval
- `DOGRAH_API_KEY`: Dograh service API key (optional)
- `DOGRAH_AGENT_UUID`: Dograh agent UUID (optional)

## Testing Process

### Manual Testing Steps
1. Login via Node.js gateway to obtain JWT token
2. Add emergency contacts through Node.js service
3. Trigger emergency webhook with valid token
4. Verify response includes user information
5. Confirm emergency contacts are processed
6. Test Dograh call initiation and WhatsApp fallback

### Expected Results
- Valid JWT tokens authenticate successfully
- MongoDB users are properly validated
- Emergency contacts are retrieved from Node.js service
- Dograh calls are initiated when configured
- WhatsApp notifications sent as fallback
- Detailed user information returned in response

## Integration Points

### With Node.js Gateway
- JWT tokens created by Node.js are validated by Python service
- Emergency contacts stored in Node.js are retrieved by Python service
- Shared JWT secret ensures compatibility

### With Dograh Service
- Emergency calls initiated via Dograh API when configured
- Dynamic data injection for personalized emergency calls
- Fallback mechanism when Dograh is unavailable

### With WhatsApp Service
- SMS notifications sent as fallback when Dograh fails
- Rich information included in WhatsApp messages
- Proper error handling for messaging failures

## Troubleshooting

### Common Issues
1. **Token Validation Failure**: Check JWT_SECRET alignment between services
2. **Contact Retrieval Failure**: Verify NODEJS_GATEWAY_URL accessibility
3. **MongoDB Connection Issues**: Ensure MongoDB is accessible and user exists
4. **Dograh Configuration**: Confirm API keys and agent UUID are set

### Debugging Steps
1. Check logs for specific error messages
2. Verify environment variables are set correctly
3. Test Node.js service connectivity independently
4. Validate MongoDB user exists with expected ID
5. Confirm JWT token structure matches expectations

## Maintenance Guidelines

### Regular Monitoring
- Monitor authentication success rates
- Track emergency contact retrieval success
- Watch Dograh service availability
- Review error logs for authentication failures

### Updates and Changes
- Maintain JWT secret consistency across services
- Update contact retrieval endpoint if Node.js API changes
- Modify MongoDB user schema if user model changes
- Adjust response format as requirements evolve

## Performance Considerations
- Async HTTP requests to Node.js service for contact retrieval
- Caching mechanisms should consider cross-service nature
- Database connection pooling for MongoDB
- Timeout handling for external service calls

## Future Enhancements
- Caching of emergency contacts to reduce Node.js API calls
- Bulk emergency contact processing for multiple notifications
- Enhanced error reporting and monitoring
- Integration with additional emergency notification channels