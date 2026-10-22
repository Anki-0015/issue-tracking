import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware } from '../middleware/authMiddleware';
import { uploadIssueImage } from '../controllers/uploadController';

const router = Router();
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error('Only .jpg, .jpeg, .png and .webp images are allowed'));
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
      res.status(400).json({ error: 'Image must be 4MB or smaller' });
      return;
    }

    res.status(400).json({ error: err.message || 'Upload failed' });
  });
}, uploadIssueImage);

export default router;
