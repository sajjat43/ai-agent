import express from 'express';
import { chat, getChatHistory, getAllSessions, deleteChatHistory } from '../controllers/chatController.js';

const router = express.Router();

// Chat endpoints
router.post('/chat', chat);
router.get('/history/:sessionId', getChatHistory);
router.get('/sessions', getAllSessions);
router.delete('/history/:sessionId', deleteChatHistory);

export default router; 