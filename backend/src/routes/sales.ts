import { Router } from 'express';
import { createSale, getSales, getSale, deleteSale, getTodaySales } from '../controllers/saleController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getSales);
router.get('/today', getTodaySales);
router.get('/:id', getSale);
router.post('/', createSale);
router.delete('/:id', deleteSale);

export default router;
