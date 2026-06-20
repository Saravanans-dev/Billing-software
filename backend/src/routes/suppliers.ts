import { Router } from 'express';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);

router.get('/', getSuppliers);
router.post('/', auditLog('CREATE', 'supplier'), createSupplier);
router.put('/:id', auditLog('UPDATE', 'supplier'), updateSupplier);
router.delete('/:id', authorize('admin', 'manager'), auditLog('DELETE', 'supplier'), deleteSupplier);

export default router;
