import mongoose from 'mongoose';

const chatHistorySchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userMessage: {
    type: String,
    required: true
  },
  aiResponse: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    required: true
  },
  responseTime: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'error', 'placeholder'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  userAgent: String,
  ipAddress: String
}, {
  timestamps: true
});

export default mongoose.model('ChatHistory', chatHistorySchema); 