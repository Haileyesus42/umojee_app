import multer from 'multer';
import path from 'path';

import fs from 'fs';

// Ensure the directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Set the correct upload folder path
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `admin-${req.params.id}-${Date.now()}${ext}`); // Generate unique filename
    },
});

// File filter to only allow image uploads
const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

// Create the upload middleware
export const upload = multer({
    storage,
    fileFilter,
});
