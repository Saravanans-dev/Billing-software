import { Router } from 'express';
import { login, verifyToken, changePassword } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.get('/verify', authenticate, verifyToken);
router.post('/change-password', authenticate, changePassword);

export default router;
