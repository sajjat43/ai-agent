import express from 'express';
import { processCSV, batchProcessCSV } from '../controllers/csvController.js';

const router = express.Router();

// CSV processing endpoints
router.post('/csv/process', processCSV);
router.post('/csv/batch', batchProcessCSV);

export default router; 