// ========================
// MMoja Backend API Demo
// Fixed JavaScript Code
// ========================

// Toggle endpoint accordion
function toggleEndpoint(header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector('span:last-child');
    
    content.classList.toggle('expanded');
    icon.textContent = content.classList.contains('expanded') ? '▲' : '▼';
}

// Decode JWT token to extract user information
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Error parsing JWT token:', e);
        return null;
    }
}

// Test regular (non-protected) endpoints
async function testEndpoint(url, method, body, button) {
    const responseArea = button.parentElement.nextElementSibling;
    const responseContent = responseArea.querySelector('.response-content');
    
    // Show loading state
    const originalText = button.textContent;
    button.innerHTML = '<span class="loading"></span> Loading...';
    button.disabled = true;
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (body && method !== 'GET') {
            options.body = typeof body === 'string' ? body : JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        const responseData = await response.text();
        
        // Auto-store token if this is a login or registration response
        if (url.includes('/login') || url.includes('/signup') || url.includes('/register')) {
            try {
                const parsed = JSON.parse(responseData);
                // Look for various token field names in the response
                let token = parsed.access_token || parsed.token || (parsed.data && parsed.data.token);
                
                if (token) {
                    localStorage.setItem('jwt_token', token);
                    responseContent.textContent = JSON.stringify(parsed, null, 2) + '\n\n✅ Token saved automatically!';
                } else {
                    responseContent.textContent = JSON.stringify(parsed, null, 2);
                }
            } catch(e) {
                responseContent.textContent = responseData;
            }
        } else {
            // Format JSON response if possible
            try {
                const parsed = JSON.parse(responseData);
                responseContent.textContent = JSON.stringify(parsed, null, 2);
            } catch {
                responseContent.textContent = responseData;
            }
        }
        
        responseArea.classList.add('show');
    } catch (error) {
        responseContent.textContent = `Error: ${error.message}`;
        responseArea.classList.add('show');
    } finally {
        // Restore button state
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Test protected endpoints (require JWT)
async function testProtectedEndpoint(url, method, body, button) {
    // Save original button text and show loading state FIRST
    const originalText = button.textContent;
    button.innerHTML = '<span class="loading"></span> Loading...';
    button.disabled = true;
    
    // Check if this is a biometric enrollment endpoint
    const isBiometricEnrollment = url.includes('/face/enroll') || url.includes('/palm/enroll');
    
    // Check if this is the palm verify-file endpoint
    const isPalmVerifyFile = url.includes('/palm/verify-file');
    
    // Check if this is the palm verify endpoint (different format)
    const isPalmVerify = url.includes('/palm/verify') && !isPalmVerifyFile;
    
    // Check if this is the face verify endpoint
    const isFaceVerify = url.includes('/face/verify');
    
    // Check if this is a biometric enrollment that requires multipart form data
    const isBiometricRoute = url.includes('/biometric/');
    
    // Get token from localStorage (auto-saved after login/register)
    let token = localStorage.getItem('jwt_token');
    
    if (!token) {
        // Prompt user for token if not found
        token = prompt('Enter your JWT token (first register/login to get a token):');
        if (!token) {
            button.textContent = originalText;
            button.disabled = false;
            return;
        }
        localStorage.setItem('jwt_token', token);
    }
    
    const responseArea = button.parentElement.nextElementSibling;
    const responseContent = responseArea.querySelector('.response-content');
    
    // Declare outside for scoping
    let response;
    let responseData;
    
    try {
        // Handle biometric enrollment (multipart/form-data)
        if (isBiometricRoute) {
            // Parse the body safely, handling both string and object cases
            let data = {};
            if (body) {
                if (typeof body === 'string') {
                    try {
                        data = JSON.parse(body);
                    } catch (e) {
                        console.error('Error parsing body:', e);
                        data = {};
                    }
                } else {
                    data = body;
                }
            }
            // Ensure data is always an object
            if (typeof data !== 'object' || data === null) {
                data = {};
            }
            
            const formData = new FormData();
            
            // Determine the correct field name based on the route
            let fieldName = 'image_data'; // default
            if (url.includes('/face/')) {
                fieldName = 'face_image';
            } else if (url.includes('/palm/')) {
                fieldName = 'palm_image';
            }
            
            if (data.image_data) {
                // Convert base64 to Blob
                const byteCharacters = atob(data.image_data);
                const byteArrays = [];
                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                    const slice = byteCharacters.slice(offset, offset + 512);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    byteArrays.push(new Uint8Array(byteNumbers));
                }
                const imageBlob = new Blob(byteArrays, {type: 'image/jpeg'});
                formData.append(fieldName, imageBlob, 'biometric_image.jpg');
            }
            
            // For face enrollment, we still send the name since the backend might need it for face identification
            // But we don't send user_id since it's extracted from the JWT token
            if (isBiometricEnrollment && data && typeof data === 'object' && data.name !== undefined && data.name !== null) {
                // Only send name for enrollment (not for verification)
                formData.append('name', data.name.toString());
            }
            // Note: We don't send user_id here since it's extracted from the JWT token in the backend
            
            response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            responseData = await response.text();
        } 
        // Handle palm verify-file endpoint (multipart/form-data with user_id and file)
        else if (isPalmVerifyFile && body) {
            // Parse the body safely
            let data = {};
            if (body) {
                if (typeof body === 'string') {
                    try {
                        data = JSON.parse(body);
                    } catch (e) {
                        console.error('Error parsing body:', e);
                        data = {};
                    }
                } else {
                    data = body;
                }
            }
            // Ensure data is always an object
            if (typeof data !== 'object' || data === null) {
                data = {};
            }
            
            // Handle palm verify-file endpoint (multipart/form-data with user_id and file)
            const formData = new FormData();
            
            // Get user ID from the request data or extract from token
            let userId = (data && typeof data === 'object' && data.user_id) ? data.user_id : '';
            if (!userId || userId.trim() === '') {
                // Extract user ID from JWT token
                const tokenPayload = parseJwt(token);
                if (tokenPayload && (tokenPayload.userId || tokenPayload.sub || tokenPayload.id)) {
                    userId = tokenPayload.userId || tokenPayload.sub || tokenPayload.id;
                } else {
                    // If we can't extract user ID from token, prompt the user
                    userId = prompt('Enter user ID for palm verification:');
                    if (!userId) {
                        throw new Error('User ID is required for palm verification');
                    }
                }
            }
            
            if (data && typeof data === 'object' && data.image_data) {
                // Convert base64 to Blob for file field
                const byteCharacters = atob(data.image_data);
                const byteArrays = [];
                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                    const slice = byteCharacters.slice(offset, offset + 512);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    byteArrays.push(new Uint8Array(byteNumbers));
                }
                const imageBlob = new Blob(byteArrays, {type: 'image/jpeg'});
                formData.append('file', imageBlob, 'palm_image.jpg');
            }
            
            // Append the user ID to the form data
            formData.append('user_id', userId);
            
            response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            responseData = await response.text();
        }
        // Handle palm verify endpoint (multipart/form-data with image_data)
        else if (isPalmVerify && body) {
            // Parse the body safely
            let data = {};
            if (body) {
                if (typeof body === 'string') {
                    try {
                        data = JSON.parse(body);
                    } catch (e) {
                        console.error('Error parsing body:', e);
                        data = {};
                    }
                } else {
                    data = body;
                }
            }
            // Ensure data is always an object
            if (typeof data !== 'object' || data === null) {
                data = {};
            }
            
            // Handle palm verify endpoint (multipart/form-data with image_data)
            const formData = new FormData();
            
            if (data && typeof data === 'object' && data.image_data) {
                // Convert base64 to Blob for image_data field
                const byteCharacters = atob(data.image_data);
                const byteArrays = [];
                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                    const slice = byteCharacters.slice(offset, offset + 512);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    byteArrays.push(new Uint8Array(byteNumbers));
                }
                const imageBlob = new Blob(byteArrays, {type: 'image/jpeg'});
                formData.append('palm_image', imageBlob, 'palm_image.jpg'); // Use correct field name
            }
            
            response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            responseData = await response.text();
        }
        // Handle face verify endpoint (multipart/form-data with image_data)
        else if (isFaceVerify && body) {
            // Parse the body safely
            let data = {};
            if (body) {
                if (typeof body === 'string') {
                    try {
                        data = JSON.parse(body);
                    } catch (e) {
                        console.error('Error parsing body:', e);
                        data = {};
                    }
                } else {
                    data = body;
                }
            }
            // Ensure data is always an object
            if (typeof data !== 'object' || data === null) {
                data = {};
            }
            
            // Handle face verify endpoint (multipart/form-data with image_data)
            const formData = new FormData();
            
            if (data && typeof data === 'object' && data.image_data) {
                // Convert base64 to Blob for image_data field
                const byteCharacters = atob(data.image_data);
                const byteArrays = [];
                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                    const slice = byteCharacters.slice(offset, offset + 512);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    byteArrays.push(new Uint8Array(byteNumbers));
                }
                const imageBlob = new Blob(byteArrays, {type: 'image/jpeg'});
                formData.append('face_image', imageBlob, 'face_image.jpg'); // Use correct field name
            }
            
            response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            responseData = await response.text();
        } else {
            // Regular JSON request
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };
            if (body && method !== 'GET') {
                options.body = typeof body === 'string' ? body : JSON.stringify(body);
            }
            response = await fetch(url, options);
            responseData = await response.text();
        }
        
        // Format JSON response if possible
        try {
            const parsed = JSON.parse(responseData);
            responseContent.textContent = JSON.stringify(parsed, null, 2);
        } catch {
            responseContent.textContent = responseData;
        }
        
        // Handle 401 Unauthorized – clear invalid token
        if (response.status === 401) {
            localStorage.removeItem('jwt_token');
            alert('Token expired or invalid. Please login again.');
        }
        
        responseArea.classList.add('show');
    } catch (error) {
        responseContent.textContent = `Error: ${error.message}`;
        responseArea.classList.add('show');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Logout function – clears token from localStorage
async function logoutUser() {
    const logoutButton = document.querySelector('button[onclick="logoutUser()"]');
    const responseArea = logoutButton.parentElement.nextElementSibling;
    const responseContent = responseArea.querySelector('.response-content');
    
    const originalText = logoutButton.textContent;
    logoutButton.innerHTML = '<span class="loading"></span> Logging out...';
    logoutButton.disabled = true;
    
    try {
        localStorage.removeItem('jwt_token');
        const logoutResponse = {
            message: "Successfully logged out",
            timestamp: new Date().toISOString()
        };
        responseContent.textContent = JSON.stringify(logoutResponse, null, 2);
        responseArea.classList.add('show');
        alert('Successfully logged out. Token cleared from local storage.');
    } catch (error) {
        responseContent.textContent = `Error: ${error.message}`;
        responseArea.classList.add('show');
    } finally {
        logoutButton.textContent = originalText;
        logoutButton.disabled = false;
    }
}

// ========================
// Camera Functions for Biometric Enrollment
// ========================

// Face Enroll Camera
let videoStream = null;

function startCamera() {
    const video = document.getElementById('video');
    const startBtn = document.getElementById('start-camera-btn');
    const captureBtn = document.getElementById('capture-btn');
    const stopBtn = document.getElementById('stop-camera-btn');
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 320 },
                height: { ideal: 240 }
            } 
        })
        .then(function(stream) {
            videoStream = stream;
            video.srcObject = stream;
            video.style.display = 'block';
            video.play().catch(console.warn);
            startBtn.disabled = true;
            captureBtn.disabled = false;
            stopBtn.disabled = false;
        })
        .catch(function(error) {
            console.error("Error accessing camera:", error);
            alert("Could not access the camera.\nError: " + error.message);
        });
    } else {
        alert("Your browser does not support camera access.");
    }
}

function captureImage() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const capturedImg = document.getElementById('captured-image');
    const requestBody = document.getElementById('face-enroll-request-body');
    
    if (videoStream) {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        const base64Data = imageData.split(',')[1];
        
        // For face enrollment, only send image_data since user info comes from JWT token
        const requestObj = { image_data: base64Data };
        requestBody.value = JSON.stringify(requestObj, null, 2);
        
        capturedImg.src = imageData;
        capturedImg.style.display = 'block';
        stopCamera();
    }
}

function stopCamera() {
    const video = document.getElementById('video');
    const startBtn = document.getElementById('start-camera-btn');
    const captureBtn = document.getElementById('capture-btn');
    const stopBtn = document.getElementById('stop-camera-btn');
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    video.pause();
    video.srcObject = null;
    video.style.display = 'none';
    startBtn.disabled = false;
    captureBtn.disabled = true;
    stopBtn.disabled = true;
}

// Palm Enroll Camera
let palmVideoStream = null;

function startPalmCamera() {
    const video = document.getElementById('palm-video');
    const startBtn = document.getElementById('palm-start-camera-btn');
    const captureBtn = document.getElementById('palm-capture-btn');
    const stopBtn = document.getElementById('palm-stop-camera-btn');
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 320 },
                height: { ideal: 240 }
            } 
        })
        .then(function(stream) {
            palmVideoStream = stream;
            video.srcObject = stream;
            video.style.display = 'block';
            video.play().catch(console.warn);
            startBtn.disabled = true;
            captureBtn.disabled = false;
            stopBtn.disabled = false;
        })
        .catch(function(error) {
            console.error("Error accessing palm camera:", error);
            alert("Could not access the camera.\nError: " + error.message);
        });
    } else {
        alert("Your browser does not support camera access.");
    }
}

function capturePalmImage() {
    const video = document.getElementById('palm-video');
    const canvas = document.getElementById('palm-canvas');
    const capturedImg = document.getElementById('palm-captured-image');
    const requestBody = document.getElementById('palm-enroll-request-body');
    
    if (palmVideoStream) {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        const base64Data = imageData.split(',')[1];
        
        // For palm enrollment, only send image_data since user info comes from JWT token
        const requestObj = { image_data: base64Data };
        requestBody.value = JSON.stringify(requestObj, null, 2);
        
        capturedImg.src = imageData;
        capturedImg.style.display = 'block';
        stopPalmCamera();
    }
}

function stopPalmCamera() {
    const video = document.getElementById('palm-video');
    const startBtn = document.getElementById('palm-start-camera-btn');
    const captureBtn = document.getElementById('palm-capture-btn');
    const stopBtn = document.getElementById('palm-stop-camera-btn');
    
    if (palmVideoStream) {
        palmVideoStream.getTracks().forEach(track => track.stop());
        palmVideoStream = null;
    }
    video.pause();
    video.srcObject = null;
    video.style.display = 'none';
    startBtn.disabled = false;
    captureBtn.disabled = true;
    stopBtn.disabled = true;
}

// Face Verify Camera (if needed – HTML elements not present by default, but functions kept for completeness)
let verifyVideoStream = null;

function startVerifyCamera() {
    const video = document.getElementById('verify-video');
    const startBtn = document.getElementById('verify-start-camera-btn');
    const captureBtn = document.getElementById('verify-capture-btn');
    const stopBtn = document.getElementById('verify-stop-camera-btn');
    
    if (!video) {
        console.warn("Verify camera elements missing in HTML");
        return;
    }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function(stream) {
                verifyVideoStream = stream;
                video.srcObject = stream;
                video.style.display = 'block';
                if (startBtn) startBtn.disabled = true;
                if (captureBtn) captureBtn.disabled = false;
                if (stopBtn) stopBtn.disabled = false;
            })
            .catch(error => alert("Camera error: " + error.message));
    } else {
        alert("Camera not supported.");
    }
}

function captureVerifyImage() {
    const video = document.getElementById('verify-video');
    const canvas = document.getElementById('verify-canvas');
    const capturedImg = document.getElementById('verify-captured-image');
    const requestBody = document.getElementById('face-verify-request-body');
    if (!video || !canvas || !requestBody) return;
    if (verifyVideoStream) {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        const base64Data = imageData.split(',')[1];
        const requestObj = { image_data: base64Data };
        requestBody.value = JSON.stringify(requestObj, null, 2);
        if (capturedImg) {
            capturedImg.src = imageData;
            capturedImg.style.display = 'block';
        }
    }
}

function stopVerifyCamera() {
    const video = document.getElementById('verify-video');
    const startBtn = document.getElementById('verify-start-camera-btn');
    const captureBtn = document.getElementById('verify-capture-btn');
    const stopBtn = document.getElementById('verify-stop-camera-btn');
    if (verifyVideoStream) {
        verifyVideoStream.getTracks().forEach(track => track.stop());
        verifyVideoStream = null;
    }
    if (video) video.style.display = 'none';
    if (startBtn) startBtn.disabled = false;
    if (captureBtn) captureBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
}

// Palm Verify Camera
let palmVerifyVideoStream = null;

function startPalmVerifyCamera() {
    const video = document.getElementById('palm-verify-video');
    const startBtn = document.getElementById('palm-verify-start-camera-btn');
    const captureBtn = document.getElementById('palm-verify-capture-btn');
    const stopBtn = document.getElementById('palm-verify-stop-camera-btn');
    
    if (!video) return;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function(stream) {
                palmVerifyVideoStream = stream;
                video.srcObject = stream;
                video.style.display = 'block';
                // ✅ CRITICAL: Start playing the video stream
                video.play().catch(e => console.warn("Autoplay prevented:", e));
                if (startBtn) startBtn.disabled = true;
                if (captureBtn) captureBtn.disabled = false;
                if (stopBtn) stopBtn.disabled = false;
            })
            .catch(error => alert("Camera error: " + error.message));
    } else {
        alert("Camera not supported.");
    }
}

function capturePalmVerifyImage() {
    const video = document.getElementById('palm-verify-video');
    const canvas = document.getElementById('palm-verify-canvas');
    const capturedImg = document.getElementById('palm-verify-captured-image');
    const requestBody = document.getElementById('palm-verify-request-body');
    
    if (!video || !canvas || !requestBody) return;
    if (palmVerifyVideoStream && video.videoWidth > 0 && video.videoHeight > 0) {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        const base64Data = imageData.split(',')[1];
        const requestObj = { image_data: base64Data }; // Include only image_data since backend expects image data
        requestBody.value = JSON.stringify(requestObj, null, 2);
        if (capturedImg) {
            capturedImg.src = imageData;
            capturedImg.style.display = 'block';
        }
        
        // ✅ Stop the camera after capturing (freeze on last frame)
        stopPalmVerifyCamera();
    } else {
        alert("Camera not ready or video dimensions zero. Make sure camera is streaming.");
    }
}

function stopPalmVerifyCamera() {
    const video = document.getElementById('palm-verify-video');
    const startBtn = document.getElementById('palm-verify-start-camera-btn');
    const captureBtn = document.getElementById('palm-verify-capture-btn');
    const stopBtn = document.getElementById('palm-verify-stop-camera-btn');
    if (palmVerifyVideoStream) {
        palmVerifyVideoStream.getTracks().forEach(track => track.stop());
        palmVerifyVideoStream = null;
    }
    if (video) video.style.display = 'none';
    if (startBtn) startBtn.disabled = false;
    if (captureBtn) captureBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
}

// Face Verify Camera
let faceVerifyVideoStream = null;

function startFaceVerifyCamera() {
    const video = document.getElementById('face-verify-video');
    const startBtn = document.getElementById('face-verify-start-camera-btn');
    const captureBtn = document.getElementById('face-verify-capture-btn');
    const stopBtn = document.getElementById('face-verify-stop-camera-btn');
    
    if (!video) return;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function(stream) {
                faceVerifyVideoStream = stream;
                video.srcObject = stream;
                video.style.display = 'block';
                // ✅ CRITICAL: Start playing the video stream
                video.play().catch(e => console.warn("Autoplay prevented:", e));
                if (startBtn) startBtn.disabled = true;
                if (captureBtn) captureBtn.disabled = false;
                if (stopBtn) stopBtn.disabled = true;
            })
            .catch(error => alert("Camera error: " + error.message));
    } else {
        alert("Camera not supported.");
    }
}

function captureFaceVerifyImage() {
    const video = document.getElementById('face-verify-video');
    const canvas = document.getElementById('face-verify-canvas');
    const capturedImg = document.getElementById('face-verify-captured-image');
    const requestBody = document.getElementById('face-verify-request-body');
    
    if (!video || !canvas || !requestBody) return;
    if (faceVerifyVideoStream && video.videoWidth > 0 && video.videoHeight > 0) {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        const base64Data = imageData.split(',')[1];
        const requestObj = { image_data: base64Data }; // Include only image_data since backend expects image data
        requestBody.value = JSON.stringify(requestObj, null, 2);
        if (capturedImg) {
            capturedImg.src = imageData;
            capturedImg.style.display = 'block';
        }
        
        // ✅ Stop the camera after capturing (freeze on last frame)
        stopFaceVerifyCamera();
    } else {
        alert("Camera not ready or video dimensions zero. Make sure camera is streaming.");
    }
}

function stopFaceVerifyCamera() {
    const video = document.getElementById('face-verify-video');
    const startBtn = document.getElementById('face-verify-start-camera-btn');
    const captureBtn = document.getElementById('face-verify-capture-btn');
    const stopBtn = document.getElementById('face-verify-stop-camera-btn');
    if (faceVerifyVideoStream) {
        faceVerifyVideoStream.getTracks().forEach(track => track.stop());
        faceVerifyVideoStream = null;
    }
    if (video) video.style.display = 'none';
    if (startBtn) startBtn.disabled = false;
    if (captureBtn) captureBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
}

// Face Login Camera
let faceLoginVideoStream = null;

function startFaceLoginCamera() {
    const video = document.getElementById('face-login-video');
    const startBtn = document.getElementById('face-login-start-camera-btn');
    const captureBtn = document.getElementById('face-login-capture-btn');
    const stopBtn = document.getElementById('face-login-stop-camera-btn');
    
    if (!video) return;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function(stream) {
                faceLoginVideoStream = stream;
                video.srcObject = stream;
                video.style.display = 'block';
                // ✅ CRITICAL: Start playing the video stream
                video.play().catch(e => console.warn("Autoplay prevented:", e));
                if (startBtn) startBtn.disabled = true;
                if (captureBtn) captureBtn.disabled = false;
                if (stopBtn) stopBtn.disabled = true;
            })
            .catch(error => alert("Camera error: " + error.message));
    } else {
        alert("Camera not supported.");
    }
}

function captureFaceLoginImage() {
    const video = document.getElementById('face-login-video');
    const canvas = document.getElementById('face-login-canvas');
    const capturedImg = document.getElementById('face-login-captured-image');
    const requestBody = document.getElementById('face-login-request-body');
    
    if (!video || !canvas || !requestBody) return;
    if (faceLoginVideoStream && video.videoWidth > 0 && video.videoHeight > 0) {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        const base64Data = imageData.split(',')[1];
        const requestObj = { image_data: base64Data }; // Include only image_data since backend expects image data
        requestBody.value = JSON.stringify(requestObj, null, 2);
        if (capturedImg) {
            capturedImg.src = imageData;
            capturedImg.style.display = 'block';
        }
        
        // ✅ Stop the camera after capturing (freeze on last frame)
        stopFaceLoginCamera();
    } else {
        alert("Camera not ready or video dimensions zero. Make sure camera is streaming.");
    }
}

function stopFaceLoginCamera() {
    const video = document.getElementById('face-login-video');
    const startBtn = document.getElementById('face-login-start-camera-btn');
    const captureBtn = document.getElementById('face-login-capture-btn');
    const stopBtn = document.getElementById('face-login-stop-camera-btn');
    if (faceLoginVideoStream) {
        faceLoginVideoStream.getTracks().forEach(track => track.stop());
        faceLoginVideoStream = null;
    }
    if (video) video.style.display = 'none';
    if (startBtn) startBtn.disabled = false;
    if (captureBtn) captureBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
}

// Initialize all endpoint cards as collapsed
document.addEventListener('DOMContentLoaded', function() {
    const headers = document.querySelectorAll('.endpoint-header');
    headers.forEach(header => {
        const icon = header.querySelector('span:last-child');
        icon.textContent = '▼';
    });
});