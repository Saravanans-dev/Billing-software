import { Router } from 'express';
import { getAllData } from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(authorize('admin'));

router.get('/data', getAllData);

export default router;
