import { Router } from 'express';
import { createPurchase, getPurchases, getPurchase, deletePurchase } from '../controllers/purchaseController';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);

router.get('/', getPurchases);
router.get('/:id', getPurchase);
router.post('/', auditLog('CREATE', 'purchase'), createPurchase);
router.delete('/:id', authorize('admin', 'manager'), auditLog('DELETE', 'purchase'), deletePurchase);

export default router;
