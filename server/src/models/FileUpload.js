import mongoose from 'mongoose';

const fileUploadSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  originalName: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  analysisPrompts: [{
    prompt: String,
    response: String,
    model: String,
    provider: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('FileUpload', fileUploadSchema); 