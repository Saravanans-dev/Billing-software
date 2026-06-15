import { Router } from 'express';
import { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, getCustomerHistory } from '../controllers/customerController';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);

router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.get('/:id/history', getCustomerHistory);
router.post('/', auditLog('CREATE', 'customer'), createCustomer);
router.put('/:id', auditLog('UPDATE', 'customer'), updateCustomer);
router.delete('/:id', authorize('admin', 'manager'), auditLog('DELETE', 'customer'), deleteCustomer);

export default router;
