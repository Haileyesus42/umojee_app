import fs from 'fs';
import multer from 'multer';
import path from 'path';

const supportUploadDir = path.join(__dirname, '../clientsUploads');

if (!fs.existsSync(supportUploadDir)) {
  fs.mkdirSync(supportUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, supportUploadDir);
  },
  filename: (req: any, file, cb) => {
    const ext = path.extname(file.originalname);
    const ownerId = req.userId?.toString?.() || req.params.id || 'support';
    cb(null, `support-${ownerId}-${Date.now()}${ext}`);
  },
});

export const supportClientUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
});
