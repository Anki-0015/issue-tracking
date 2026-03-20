import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/authMiddleware';
import { uploadIssueImage } from '../controllers/uploadController';

const router = Router();

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safeOriginalName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are supported at this stage'));
      return;
    }

    cb(null, true);
  },
});

router.post('/image', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  upload.single('image')(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'Image must be 5MB or smaller' });
      return;
    }

    res.status(400).json({ error: err.message || 'Upload failed' });
  });
}, uploadIssueImage);

export default router;
