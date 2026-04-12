import express from 'express';
import {
  getAllProperties,
  createProperty,
  getProperty,
  updateProperty
} from '../../controllers/propertyController.js';

import { protect, authorize } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect, authorize('admin', 'manager'));

router.get('/', getAllProperties);
router.post('/', createProperty);
router.get('/:id', getProperty);
router.put('/:id', updateProperty);
router.patch('/:id', updateProperty);

export default router;