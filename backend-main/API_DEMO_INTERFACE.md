# API Demo Interface Documentation

## Overview
This document describes the optimized API demo interface that provides a user-friendly way to test all endpoints in the MMoja system. The interface has been streamlined with reduced CSS styling while improving functionality for expanded sections.

## Interface Features

### Optimized Styling
- **Reduced CSS Complexity**: Simplified color scheme, borders, and visual effects
- **Cleaner Layout**: Streamlined spacing and typography
- **Responsive Design**: Maintains usability across different screen sizes
- **Performance**: Faster loading with fewer CSS rules

### Enhanced Expandable Sections
- **Better Visibility**: Expanded sections now have improved height management
- **Scrollable Content**: Long responses can be scrolled within the section
- **Clear Indicators**: Visual indicators show expanded/collapsed state
- **Smooth Transitions**: Improved user experience when toggling sections

## Structure

### Endpoint Organization
The interface is organized into logical sections:
- **Node.js Auth & User Endpoints**: Authentication and user management
- **Biometric Endpoints**: Face and palm enrollment/verification
- **Emergency Webhook**: Emergency signal processing
- **Health Checks**: Service availability monitoring

### Interactive Elements
- **Toggle Headers**: Click to expand/collapse endpoint sections
- **Test Buttons**: Execute API requests directly from the interface
- **Response Display**: Real-time display of API responses
- **Token Management**: Automatic JWT token handling

## Functionality

### Authentication Flow
1. **Login/Signup**: Obtain JWT token via Node.js gateway
2. **Token Storage**: Automatically stored in browser's localStorage
3. **Protected Endpoints**: Authorization header automatically added
4. **Token Refresh**: Handles expired tokens with appropriate messages

### API Testing Capabilities
- **Request Building**: Pre-filled request bodies for common operations
- **Response Analysis**: Formatted display of API responses
- **Error Handling**: Clear error messages for failed requests
- **Cross-Service Testing**: Test integration between Node.js and Python services

## Key Improvements

### CSS Optimization
- **Simplified Color Palette**: Reduced from complex gradients to clean, flat colors
- **Consistent Spacing**: Standardized padding and margins throughout
- **Minimalist Design**: Removed unnecessary visual elements
- **Faster Rendering**: Reduced CSS complexity for better performance

### Enhanced UX for Expanded Sections
- **Increased Height**: Expanded sections now show more content
- **Vertical Scrolling**: Long responses can be scrolled without expanding the page
- **Better Readability**: Improved text formatting in response areas
- **Visual Clarity**: Clear distinction between expanded and collapsed states

## Technical Implementation

### JavaScript Functions
- **toggleEndpoint()**: Handles expand/collapse functionality
- **testGatewayEndpoint()**: Executes requests to Node.js gateway
- **testGatewayProtected()**: Handles authenticated requests
- **parseJwt()**: Decodes JWT tokens for user information
- **Camera Functions**: Manages camera access for biometric endpoints

### HTML Structure
- **Accordion Layout**: Organized sections with expandable content
- **Form Elements**: Input fields for dynamic data entry
- **Response Areas**: Dedicated sections for displaying API responses
- **Status Indicators**: Visual feedback for request status

## Usage Guide

### Getting Started
1. Open the HTML file in a web browser
2. Login via the signup/login endpoints to obtain a JWT token
3. Add emergency contacts through the emergency contact endpoints
4. Test various API endpoints using the provided buttons

### Testing Emergency Webhook
1. Ensure you're logged in (JWT token present)
2. Add emergency contacts to your user account
3. Use the emergency webhook endpoint to trigger an emergency
4. Verify that the response includes detailed user information
5. Check logs to confirm emergency processing occurred

### Biometric Testing
1. Use camera-enabled devices for face/palm enrollment
2. Start camera and capture images as prompted
3. Test enrollment and verification endpoints
4. Verify responses contain appropriate biometric data

## Integration Points

### With Backend Services
- **Node.js Gateway**: Handles authentication and user management
- **Python AI Service**: Processes emergency webhooks and biometric data
- **MongoDB**: Stores user information and emergency contacts
- **Dograh Service**: Handles emergency call processing
- **WhatsApp Service**: Provides fallback notification mechanism

### Cross-Service Operations
- **JWT Token Sharing**: Tokens created by Node.js work with Python service
- **Emergency Contact Retrieval**: Python service fetches contacts from Node.js
- **Unified Response Format**: Consistent responses across all services

## Troubleshooting

### Common Issues
1. **Token Expiration**: Login again when receiving 401 errors
2. **CORS Issues**: Run services on localhost with proper CORS configuration
3. **Camera Access**: Ensure browser permissions allow camera access
4. **Network Errors**: Verify all services are running and accessible

### Debugging Tips
- Check browser console for JavaScript errors
- Verify all services are running on expected ports
- Confirm environment variables are properly configured
- Review response bodies for detailed error information

## Customization

### Adding New Endpoints
- Add new endpoint cards with appropriate method tags
- Include proper request body templates
- Link to appropriate test functions
- Add response areas for the new endpoints

### Styling Modifications
- Modify CSS variables for quick theme changes
- Adjust spacing and sizing in the main style block
- Update color scheme to match brand requirements
- Optimize for specific screen sizes as needed

## Security Considerations

### Client-Side Security
- JWT tokens stored in browser localStorage
- No sensitive credentials exposed in client code
- Proper authentication headers for protected endpoints
- Secure transmission via HTTPS in production

### API Access
- All endpoints require proper authentication
- Rate limiting should be implemented on server side
- Input validation occurs on server side
- Error messages don't expose sensitive information