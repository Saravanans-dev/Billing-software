import { Router } from 'express';
import { getPendingPayments, recordPayment, getPaymentHistory } from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/pending', getPendingPayments);
router.post('/', recordPayment);
router.get('/history', getPaymentHistory);

export default router;
