import express from 'express';
import upload from '../config/multer.js';
import { 
  uploadFile, 
  getFiles, 
  analyzeFile, 
  getFileAnalysis, 
  deleteFile 
} from '../controllers/fileController.js';

const router = express.Router();

// File endpoints
router.post('/upload', upload.single('file'), uploadFile);
router.get('/files/:sessionId', getFiles);
router.post('/analyze-file', analyzeFile);
router.get('/file-analysis/:fileId', getFileAnalysis);
router.delete('/files/:fileId', deleteFile);

export default router; 