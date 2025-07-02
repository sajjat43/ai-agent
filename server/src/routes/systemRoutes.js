import express from 'express';
import { healthCheck, getModels, getStats } from '../controllers/systemController.js';

const router = express.Router();

// System endpoints
router.get('/health', healthCheck);
router.get('/models', getModels);
router.get('/stats', getStats);

export default router; 