import { Router } from 'express';
import { getSalesReport, getStockReport, getProfitLossReport, getGSTReport, getOutstandingReport } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/sales', getSalesReport);
router.get('/stock', getStockReport);
router.get('/profit-loss', getProfitLossReport);
router.get('/gst', getGSTReport);
router.get('/outstanding', getOutstandingReport);

export default router;
