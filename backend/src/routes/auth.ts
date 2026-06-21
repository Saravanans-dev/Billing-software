import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, verifyToken, changePassword } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

router.post('/login', loginLimiter, login);
router.get('/verify', authenticate, verifyToken);
router.post('/change-password', authenticate, changePassword);

export default router;
