import { Router } from 'express';
import { exportSalesExcel, exportStockExcel, exportProductsExcel, printInvoice } from '../controllers/exportController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/sales-excel', exportSalesExcel);
router.get('/stock-excel', exportStockExcel);
router.get('/products-excel', exportProductsExcel);
router.get('/invoice/:id/pdf', printInvoice);

export default router;
