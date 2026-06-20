import { Router } from 'express';
import {
  getCompanySettings, updateCompanySettings, getSettings, updateSetting,
  getUsers, createUser, updateUser, deleteUser
} from '../controllers/settingsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/company', getCompanySettings);
router.put('/company', authorize('admin'), updateCompanySettings);
router.get('/', getSettings);
router.put('/', authorize('admin'), updateSetting);
router.put('/:key', authorize('admin'), updateSetting);

// User management
router.get('/users', authorize('admin'), getUsers);
router.post('/users', authorize('admin'), createUser);
router.put('/users/:id', authorize('admin'), updateUser);
router.delete('/users/:id', authorize('admin'), deleteUser);

export default router;
