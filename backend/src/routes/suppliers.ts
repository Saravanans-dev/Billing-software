import { Router } from 'express';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', authorize('admin', 'manager'), deleteSupplier);

export default router;
