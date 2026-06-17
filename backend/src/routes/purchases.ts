import { Router } from 'express';
import { createPurchase, getPurchases, getPurchase, deletePurchase } from '../controllers/purchaseController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getPurchases);
router.get('/:id', getPurchase);
router.post('/', createPurchase);
router.delete('/:id', authorize('admin', 'manager'), deletePurchase);

export default router;
