import { Router } from 'express';
import { createSale, getSales, getSale, deleteSale, getTodaySales } from '../controllers/saleController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getSales);
router.get('/today', getTodaySales);
router.get('/:id', getSale);
router.post('/', createSale);
router.delete('/:id', authorize('admin', 'manager'), deleteSale);

export default router;
