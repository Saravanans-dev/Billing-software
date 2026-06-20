import { Router } from 'express';
import { createSale, getSales, getSale, deleteSale, getTodaySales } from '../controllers/saleController';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);

router.get('/', getSales);
router.get('/today', getTodaySales);
router.get('/:id', getSale);
router.post('/', auditLog('CREATE', 'sale'), createSale);
router.delete('/:id', authorize('admin', 'manager'), auditLog('DELETE', 'sale'), deleteSale);

export default router;
