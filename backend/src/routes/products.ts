import { Router } from 'express';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct, bulkImportProducts } from '../controllers/productController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', authorize('admin', 'manager'), deleteProduct);
router.post('/bulk-import', authorize('admin'), bulkImportProducts);

export default router;
