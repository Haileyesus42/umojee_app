import multer from 'multer';
import path from 'path';

import fs from 'fs';

const clientUploadDir = path.join(__dirname, '../clientsUploads');

if (!fs.existsSync(clientUploadDir)) {
    fs.mkdirSync(clientUploadDir, { recursive: true });
}

// Configure storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, clientUploadDir); // Set the correct upload folder path
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `client-${req.params.id}-${Date.now()}${ext}`); // Generate unique filename
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

export const clientUpload = multer({
    storage,
    fileFilter
})
