import multer from 'multer';

// Configure storage for biometric uploaded files in memory
const storage = multer.memoryStorage();

// File filter to only allow image uploads for biometric data
const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images for biometric data.'), false);
    }
};

export const biometricUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Limit file size to 5MB
    }
});

// Updated to match what api_demo_standard.js client sends for face endpoints
export const uploadFaceImage = biometricUpload.single('face_image');

// Keep palm_image as is for now (assuming Python service expects 'palm_image')
export const uploadPalmImage = biometricUpload.single('palm_image');