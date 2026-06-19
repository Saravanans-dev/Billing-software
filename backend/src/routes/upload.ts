import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize } from '../middleware/auth';
import pool from '../config/database';

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['.jpeg', '.jpg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, png, gif, webp) are allowed'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

const router = Router();
router.use(authenticate);

router.post('/logo', authorize('admin'), (req: Request, res: Response) => {
  upload.single('logo')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
      const logoUrl = `/uploads/${req.file.filename}`;
      const existing = await pool.query('SELECT id FROM company_settings LIMIT 1');
      if (existing.rows[0]?.id) {
        await pool.query('UPDATE company_settings SET logo_url=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2', [logoUrl, existing.rows[0].id]);
      }
      res.json({ logo_url: logoUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Upload failed' });
    }
  });
});

export default router;
