import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import multer from 'multer';
import mime from 'mime-types';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('🗄️  Connected to MongoDB successfully');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

// Chat History Schema
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

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);

// File Upload Schema
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

const FileUpload = mongoose.model('FileUpload', fileUploadSchema);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow text files, documents, and common file types
    const allowedTypes = [
      'text/plain',
      'text/csv',
      'application/json',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/html',
      'text/xml',
      'application/xml',
      'text/markdown'
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported. Please upload text files, documents, or CSV files.'), false);
    }
  }
});

// File reading utility
const readFileContent = async (filePath, mimetype) => {
  try {
    console.log(`📖 Reading file content: ${filePath}`);
    console.log(`📄 MIME type: ${mimetype}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    console.log(`📊 File size: ${stats.size} bytes`);
    
    if (mimetype.startsWith('text/') || mimetype === 'application/json') {
      console.log(`📝 Reading as text file`);
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`✅ Text content read, length: ${content.length} characters`);
      return content;
    } else if (mimetype === 'application/pdf') {
      console.log(`📄 Reading as PDF file`);
      try {
        const pdfBuffer = fs.readFileSync(filePath);
        console.log(`📄 PDF buffer size: ${pdfBuffer.length} bytes`);
        
        if (pdfBuffer.length === 0) {
          throw new Error('PDF file is empty');
        }
        
        // Dynamic import to avoid startup issues with pdf-parse
        const pdfParse = (await import('pdf-parse')).default;
        const pdfDataResult = await pdfParse(pdfBuffer);
        
        if (!pdfDataResult || !pdfDataResult.text) {
          throw new Error('PDF parsing returned no text content');
        }
        
        console.log(`✅ PDF parsed, text length: ${pdfDataResult.text.length} characters`);
        
        if (pdfDataResult.text.length === 0) {
          return '[PDF file contains no readable text content]';
        }
        
        return pdfDataResult.text;
      } catch (pdfError) {
        console.error(`❌ PDF parsing failed: ${pdfError.message}`);
        console.error(`❌ PDF error stack: ${pdfError.stack}`);
        
        // Return a more helpful error message
        if (pdfError.message.includes('Invalid PDF')) {
          throw new Error('Invalid PDF file format. Please ensure the file is a valid PDF.');
        } else if (pdfError.message.includes('encrypted')) {
          throw new Error('PDF file is encrypted or password-protected. Please upload an unprotected PDF.');
        } else {
          throw new Error(`Failed to parse PDF: ${pdfError.message}`);
        }
      }
    } else if (mimetype.includes('word') || mimetype.includes('excel')) {
      console.log(`📄 Office document detected (not implemented)`);
      // For Office documents, return placeholder - you might want to add mammoth or xlsx libraries
      return '[Office document content - Office document parsing not implemented yet]';
    } else {
      console.log(`📄 Reading as generic text file`);
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`✅ Generic content read, length: ${content.length} characters`);
      return content;
    }
  } catch (error) {
    console.error(`❌ Failed to read file content: ${error.message}`);
    console.error(`❌ File path: ${filePath}`);
    console.error(`❌ MIME type: ${mimetype}`);
    throw new Error(`Failed to read file content: ${error.message}`);
  }
};

// Usage tracking
const usageStats = {
  totalRequests: 0,
  modelUsage: {},
  providerUsage: {},
  errors: {},
  requestHistory: []
};

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Logging utility
const logModelUsage = (provider, model, status, responseTime, error = null) => {
  const timestamp = new Date().toISOString();
  
  // Update usage stats
  usageStats.totalRequests++;
  usageStats.modelUsage[model] = (usageStats.modelUsage[model] || 0) + 1;
  usageStats.providerUsage[provider] = (usageStats.providerUsage[provider] || 0) + 1;
  
  if (error) {
    usageStats.errors[model] = (usageStats.errors[model] || 0) + 1;
  }
  
  // Add to request history (keep last 100 requests)
  const requestLog = {
    timestamp,
    provider,
    model,
    status,
    responseTime,
    error: error ? error.message : null
  };
  
  usageStats.requestHistory.unshift(requestLog);
  if (usageStats.requestHistory.length > 100) {
    usageStats.requestHistory.pop();
  }
  
  // Console logging
  const statusIcon = status === 'success' ? '✅' : status === 'error' ? '❌' : '⚠️';
  const providerIcon = provider === 'google' ? '🤖' : 
                      provider === 'openai' ? '🧠' : 
                      provider === 'anthropic' ? '🎭' : '🔮';
  
  console.log(`${statusIcon} ${providerIcon} [${timestamp}] ${provider.toUpperCase()} - ${model}`);
  console.log(`   Status: ${status.toUpperCase()} | Response Time: ${responseTime}ms`);
  if (error) {
    console.log(`   Error: ${error.message}`);
  }
  console.log(`   Total Requests: ${usageStats.totalRequests} | Model Usage: ${usageStats.modelUsage[model]}`);
  console.log('─'.repeat(80));
};

// Provider handlers
const providerHandlers = {
  google: async (message, modelName) => {
    const startTime = Date.now();
    try {
      if (!process.env.GEMINI_API_KEY) {
        const responseTime = Date.now() - startTime;
        const error = new Error('Google AI API key not configured');
        logModelUsage('google', modelName, 'error', responseTime, error);
        return {
          response: `🤖 ${modelName}: Google AI API key not configured. Please add GEMINI_API_KEY to your .env file to use Google models.`,
          actualModel: modelName,
          provider: 'google',
          status: 'error'
        };
      }

      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(message);
      const response = await result.response.text();
      const responseTime = Date.now() - startTime;
      
      logModelUsage('google', modelName, 'success', responseTime);
      
      return {
        response,
        actualModel: modelName,
        provider: 'google',
        status: 'success'
      };
    } catch (err) {
      const responseTime = Date.now() - startTime;
      logModelUsage('google', modelName, 'error', responseTime, err);
      return {
        response: `🤖 ${modelName}: Error - ${err.message}. Please check your Google AI API key and model availability.`,
        actualModel: modelName,
        provider: 'google',
        status: 'error'
      };
    }
  },
  
  openai: async (message, modelName) => {
    const startTime = Date.now();
    try {
      if (!process.env.OPENAI_API_KEY) {
        const responseTime = Date.now() - startTime;
        const error = new Error('OpenAI API key not configured');
        logModelUsage('openai', modelName, 'error', responseTime, error);
        return {
          response: `🧠 ${modelName}: OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file to use OpenAI models.`,
          actualModel: modelName,
          provider: 'openai',
          status: 'error'
        };
      }

      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: message }],
        model: modelName,
        max_tokens: message.includes('File Content:') ? 2000 : 1000,
        temperature: 0.7,
      });
      
      const responseTime = Date.now() - startTime;
      logModelUsage('openai', completion.model, 'success', responseTime);
      
      return {
        response: completion.choices[0].message.content,
        actualModel: completion.model,
        provider: 'openai',
        status: 'success'
      };
    } catch (err) {
      const responseTime = Date.now() - startTime;
      logModelUsage('openai', modelName, 'error', responseTime, err);
      return {
        response: `🧠 ${modelName}: Error - ${err.message}. Please check your OpenAI API key and model availability.`,
        actualModel: modelName,
        provider: 'openai',
        status: 'error'
      };
    }
  },
  
  anthropic: async (message, modelName) => {
    const startTime = Date.now();
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        const responseTime = Date.now() - startTime;
        const error = new Error('Anthropic API key not configured');
        logModelUsage('anthropic', modelName, 'error', responseTime, error);
        return {
          response: `🎭 ${modelName}: Anthropic API key not configured. Please add ANTHROPIC_API_KEY to your .env file to use Claude models.`,
          actualModel: modelName,
          provider: 'anthropic',
          status: 'error'
        };
      }

      const msg = await anthropic.messages.create({
        model: modelName,
        max_tokens: message.includes('File Content:') ? 2000 : 1000,
        messages: [{ role: "user", content: message }],
      });
      
      const responseTime = Date.now() - startTime;
      logModelUsage('anthropic', modelName, 'success', responseTime);
      
      return {
        response: msg.content[0].text,
        actualModel: modelName,
        provider: 'anthropic',
        status: 'success'
      };
    } catch (err) {
      const responseTime = Date.now() - startTime;
      logModelUsage('anthropic', modelName, 'error', responseTime, err);
      return {
        response: `🎭 ${modelName}: Error - ${err.message}. Please check your Anthropic API key and model availability.`,
        actualModel: modelName,
        provider: 'anthropic',
        status: 'error'
      };
    }
  },

  // Add support for other providers
  cohere: async (message, modelName) => {
    const startTime = Date.now();
    const responseTime = Date.now() - startTime;
    logModelUsage('cohere', modelName, 'placeholder', responseTime);
    return {
      response: `🔮 ${modelName}: Cohere integration not implemented yet. To add Cohere support, install the cohere-ai package and add your API key.`,
      actualModel: modelName,
      provider: 'cohere',
      status: 'placeholder'
    };
  },

  huggingface: async (message, modelName) => {
    const startTime = Date.now();
    const responseTime = Date.now() - startTime;
    logModelUsage('huggingface', modelName, 'placeholder', responseTime);
    return {
      response: `🤗 ${modelName}: Hugging Face integration not implemented yet. To add Hugging Face support, install @huggingface/inference and add your API key.`,
      actualModel: modelName,
      provider: 'huggingface',
      status: 'placeholder'
    };
  }
};

// Model validation and status
const supportedModels = {
  google: {
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-pro-vision'],
    status: process.env.GEMINI_API_KEY ? 'active' : 'needs_key'
  },
  openai: {
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-4-turbo-preview', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
    status: process.env.OPENAI_API_KEY ? 'active' : 'needs_key'
  },
  anthropic: {
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    status: process.env.ANTHROPIC_API_KEY ? 'active' : 'needs_key'
  },
  cohere: {
    models: ['command', 'command-light', 'command-nightly'],
    status: 'placeholder'
  },
  huggingface: {
    models: ['microsoft/DialoGPT-large', 'facebook/blenderbot-400M-distill'],
    status: 'placeholder'
  }
};

// Save chat to database
const saveChatHistory = async (sessionId, userMessage, aiResponse, model, provider, responseTime, status, req) => {
  try {
    const chatRecord = new ChatHistory({
      sessionId,
      userMessage,
      aiResponse,
      model,
      provider,
      responseTime,
      status,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    await chatRecord.save();
    console.log(`💾 Chat saved to database | Session: ${sessionId} | Model: ${model}`);
  } catch (error) {
    console.error('❌ Error saving chat history:', error.message);
  }
};

app.post('/api/chat', async (req, res) => {
  const { message, model, provider, sessionId } = req.body;
  const requestStart = Date.now();
  const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log('\n🔄 NEW REQUEST');
  console.log(`📝 Message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
  console.log(`🎯 Requested Model: ${model}`);
  console.log(`🏢 Provider: ${provider.toUpperCase()}`);
  console.log(`🔗 Session ID: ${currentSessionId}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  // Validation
  if (!message || !message.trim()) {
    console.log('❌ Validation Error: Message is required');
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!model || !provider) {
    console.log('❌ Validation Error: Model and provider are required');
    return res.status(400).json({ error: 'Model and provider are required' });
  }

  // Check if provider is supported
  if (!providerHandlers[provider]) {
    console.log(`❌ Validation Error: Unsupported provider: ${provider}`);
    return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  }

  // Check if model is supported for the provider
  if (!supportedModels[provider] || !supportedModels[provider].models.includes(model)) {
    console.warn(`⚠️  Model ${model} not in supported list for ${provider}, attempting anyway...`);
  }

  try {
    // Get conversation memory (previous chat history)
    console.log('🧠 Retrieving conversation memory...');
    const recentHistory = await ChatHistory.find({ sessionId: currentSessionId })
      .sort({ timestamp: -1 })
      .limit(10) // Get last 10 exchanges
      .select('userMessage aiResponse timestamp');
    
    // Get uploaded files context
    console.log('📁 Retrieving uploaded files context...');
    const uploadedFiles = await FileUpload.find({ sessionId: currentSessionId })
      .sort({ uploadedAt: -1 })
      .limit(5) // Get last 5 uploaded files
      .select('originalName content analysisPrompts uploadedAt');

    // Build context for the AI
    let contextualMessage = message;
    let conversationContext = '';
    let fileContext = '';

    // Add conversation history context
    if (recentHistory.length > 0) {
      conversationContext = '\n\n--- Previous Conversation Context ---\n';
      // Reverse to show chronological order (oldest first)
      recentHistory.reverse().forEach((chat, index) => {
        conversationContext += `[${index + 1}] User: ${chat.userMessage}\n`;
        conversationContext += `[${index + 1}] Assistant: ${chat.aiResponse.substring(0, 200)}${chat.aiResponse.length > 200 ? '...' : ''}\n\n`;
      });
      conversationContext += '--- End of Previous Context ---\n\n';
      console.log(`🧠 Added context from ${recentHistory.length} previous exchanges`);
    }

    // Add file context
    if (uploadedFiles.length > 0) {
      fileContext = '\n\n--- Available Files Context ---\n';
      uploadedFiles.forEach((file, index) => {
        fileContext += `File ${index + 1}: "${file.originalName}" (uploaded ${new Date(file.uploadedAt).toLocaleDateString()})\n`;
        
        // Add file content preview (first 500 characters)
        if (file.content) {
          fileContext += `Content preview: ${file.content.substring(0, 500)}${file.content.length > 500 ? '...' : ''}\n`;
        }
        
        // Add previous analysis if any
        if (file.analysisPrompts && file.analysisPrompts.length > 0) {
          fileContext += `Previous analyses: ${file.analysisPrompts.length} analysis(es) performed\n`;
          const lastAnalysis = file.analysisPrompts[file.analysisPrompts.length - 1];
          fileContext += `Last analysis: "${lastAnalysis.prompt}" - ${lastAnalysis.response.substring(0, 200)}${lastAnalysis.response.length > 200 ? '...' : ''}\n`;
        }
        fileContext += '\n';
      });
      fileContext += '--- End of Files Context ---\n\n';
      console.log(`📁 Added context from ${uploadedFiles.length} uploaded files`);
    }

    // Combine contexts with the current message
    if (conversationContext || fileContext) {
      contextualMessage = `${conversationContext}${fileContext}Current user message: ${message}

Please respond to the current user message while being aware of our previous conversation and any uploaded files. If the user refers to previous messages or files, use the provided context to give a relevant response.`;
    }

    const handler = providerHandlers[provider];
    const result = await handler(contextualMessage, model);
    
    const totalTime = Date.now() - requestStart;
    console.log(`✅ Request completed in ${totalTime}ms | Model: ${result.actualModel} | Provider: ${result.provider.toUpperCase()}\n`);
    
    // Save to database (save original message, not the contextual one)
    await saveChatHistory(currentSessionId, message, result.response, result.actualModel, result.provider, totalTime, result.status, req);
    
    res.json({
      response: result.response,
      model: result.actualModel,
      provider: result.provider,
      status: result.status,
      sessionId: currentSessionId,
      timestamp: new Date().toISOString(),
      contextUsed: {
        conversationHistory: recentHistory.length > 0,
        uploadedFiles: uploadedFiles.length > 0,
        historyCount: recentHistory.length,
        filesCount: uploadedFiles.length
      }
    });
  } catch (err) {
    const totalTime = Date.now() - requestStart;
    console.error(`❌ Request failed after ${totalTime}ms | Model: ${model} | Provider: ${provider.toUpperCase()} | Error: ${err.message}\n`);
    logModelUsage(provider, model, 'error', totalTime, err);
    
    // Save error to database
    await saveChatHistory(currentSessionId, message, `Error: ${err.message}`, model, provider, totalTime, 'error', req);
    
    res.status(500).json({ 
      error: err.message,
      model,
      provider,
      status: 'error',
      sessionId: currentSessionId
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const providerStatus = {};
  Object.keys(supportedModels).forEach(provider => {
    providerStatus[provider] = supportedModels[provider].status;
  });

  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supportedProviders: Object.keys(providerHandlers),
    providerStatus,
    apiKeys: {
      google: !!process.env.GEMINI_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY
    },
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Get available models endpoint
app.get('/api/models', (req, res) => {
  res.json({
    providers: Object.keys(supportedModels).map(provider => ({
      name: provider,
      models: supportedModels[provider].models,
      status: supportedModels[provider].status,
      hasApiKey: provider === 'google' ? !!process.env.GEMINI_API_KEY :
                 provider === 'openai' ? !!process.env.OPENAI_API_KEY :
                 provider === 'anthropic' ? !!process.env.ANTHROPIC_API_KEY :
                 false
    }))
  });
});

// Usage statistics endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const totalChats = await ChatHistory.countDocuments();
    const modelStats = await ChatHistory.aggregate([
      { $group: { _id: '$model', count: { $sum: 1 }, avgResponseTime: { $avg: '$responseTime' } } },
      { $sort: { count: -1 } }
    ]);
    const providerStats = await ChatHistory.aggregate([
      { $group: { _id: '$provider', count: { $sum: 1 }, avgResponseTime: { $avg: '$responseTime' } } },
      { $sort: { count: -1 } }
    ]);
    const recentChats = await ChatHistory.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .select('model provider status responseTime timestamp');

    res.json({
      ...usageStats,
      database: {
        totalChats,
        modelStats,
        providerStats,
        recentChats
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics', message: error.message });
  }
});

// Get chat history for a session
app.get('/api/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, page = 1 } = req.query;
    
    const chats = await ChatHistory.find({ sessionId })
      .sort({ timestamp: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('userMessage aiResponse model provider status responseTime timestamp');
    
    const totalChats = await ChatHistory.countDocuments({ sessionId });
    
    console.log(`📚 Retrieved ${chats.length} chat records for session: ${sessionId}`);
    
    res.json({
      sessionId,
      chats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalChats,
        pages: Math.ceil(totalChats / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching chat history:', error.message);
    res.status(500).json({ error: 'Failed to fetch chat history', message: error.message });
  }
});

// Get all sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    
    const sessions = await ChatHistory.aggregate([
      {
        $group: {
          _id: '$sessionId',
          lastMessage: { $last: '$timestamp' },
          messageCount: { $sum: 1 },
          models: { $addToSet: '$model' },
          providers: { $addToSet: '$provider' }
        }
      },
      { $sort: { lastMessage: -1 } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) }
    ]);
    
    const totalSessions = await ChatHistory.distinct('sessionId').then(sessions => sessions.length);
    
    console.log(`📋 Retrieved ${sessions.length} sessions`);
    
    res.json({
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalSessions,
        pages: Math.ceil(totalSessions / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching sessions:', error.message);
    res.status(500).json({ error: 'Failed to fetch sessions', message: error.message });
  }
});

// Delete chat history for a session
app.delete('/api/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await ChatHistory.deleteMany({ sessionId });
    
    console.log(`🗑️  Deleted ${result.deletedCount} chat records for session: ${sessionId}`);
    
    res.json({
      message: 'Chat history deleted successfully',
      deletedCount: result.deletedCount,
      sessionId
    });
  } catch (error) {
    console.error('❌ Error deleting chat history:', error.message);
    res.status(500).json({ error: 'Failed to delete chat history', message: error.message });
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const filePath = req.file.path;
    console.log(`📁 Processing file upload: ${req.file.originalname}`);
    console.log(`📂 File path: ${filePath}`);
    console.log(`📊 File size: ${req.file.size} bytes`);
    console.log(`🔍 MIME type: ${req.file.mimetype}`);

    // Check if file exists before trying to read it
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File does not exist at path: ${filePath}`);
      return res.status(500).json({ error: 'Uploaded file not found on server' });
    }

    let fileContent;
    try {
      fileContent = await readFileContent(filePath, req.file.mimetype);
      console.log(`✅ File content read successfully, length: ${fileContent.length} characters`);
    } catch (readError) {
      console.error(`❌ Failed to read file content: ${readError.message}`);
      // Clean up the uploaded file even if reading failed
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error(`❌ Failed to cleanup file: ${cleanupError.message}`);
      }
      return res.status(500).json({ 
        error: 'Failed to process file content', 
        message: readError.message 
      });
    }

    // Save file info to database
    const fileUpload = new FileUpload({
      sessionId,
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      content: fileContent
    });

    await fileUpload.save();
    console.log(`💾 File saved to database with ID: ${fileUpload._id}`);

    // Clean up uploaded file (we've stored content in DB)
    try {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Temporary file cleaned up: ${filePath}`);
    } catch (cleanupError) {
      console.error(`⚠️ Failed to cleanup temporary file: ${cleanupError.message}`);
      // Don't fail the request if cleanup fails
    }

    console.log(`📁 File uploaded successfully: ${req.file.originalname} | Session: ${sessionId} | Size: ${req.file.size} bytes`);

    res.json({
      message: 'File uploaded successfully',
      fileId: fileUpload._id,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      sessionId,
      uploadedAt: fileUpload.uploadedAt
    });
  } catch (error) {
    console.error('❌ Error uploading file:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Try to cleanup the uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log(`🗑️ Cleaned up file after error: ${req.file.path}`);
        }
      } catch (cleanupError) {
        console.error(`❌ Failed to cleanup file after error: ${cleanupError.message}`);
      }
    }
    
    res.status(500).json({ error: 'Failed to upload file', message: error.message });
  }
});

// Get uploaded files for a session
app.get('/api/files/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const files = await FileUpload.find({ sessionId })
      .sort({ uploadedAt: -1 })
      .select('originalName filename mimetype size uploadedAt analysisPrompts');

    res.json({
      sessionId,
      files
    });
  } catch (error) {
    console.error('❌ Error fetching files:', error.message);
    res.status(500).json({ error: 'Failed to fetch files', message: error.message });
  }
});

// Analyze file with AI
app.post('/api/analyze-file', async (req, res) => {
  try {
    console.log('\n🔍 ANALYZE FILE REQUEST');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { fileId, prompt, model, provider } = req.body;

    console.log(`📄 File ID: ${fileId}`);
    console.log(`💭 Prompt: ${prompt?.substring(0, 100)}${prompt?.length > 100 ? '...' : ''}`);
    console.log(`🎯 Model: ${model}`);
    console.log(`🏢 Provider: ${provider}`);

    if (!fileId || !prompt || !model || !provider) {
      console.log('❌ Missing required fields:');
      console.log(`  - fileId: ${!!fileId}`);
      console.log(`  - prompt: ${!!prompt}`);
      console.log(`  - model: ${!!model}`);
      console.log(`  - provider: ${!!provider}`);
      return res.status(400).json({ 
        error: 'File ID, prompt, model, and provider are required',
        received: { fileId: !!fileId, prompt: !!prompt, model: !!model, provider: !!provider }
      });
    }

    // Get file from database
    console.log(`🔍 Looking for file with ID: ${fileId}`);
    const file = await FileUpload.findById(fileId);
    if (!file) {
      console.log('❌ File not found in database');
      return res.status(404).json({ error: 'File not found' });
    }

    console.log(`✅ File found: ${file.originalName}`);

    // Get conversation context for better analysis
    console.log('🧠 Retrieving conversation context for analysis...');
    const recentHistory = await ChatHistory.find({ sessionId: file.sessionId })
      .sort({ timestamp: -1 })
      .limit(5) // Get last 5 exchanges for context
      .select('userMessage aiResponse timestamp');

    // Get other files in the session for context
    const otherFiles = await FileUpload.find({ 
      sessionId: file.sessionId, 
      _id: { $ne: fileId } 
    })
      .sort({ uploadedAt: -1 })
      .limit(3)
      .select('originalName analysisPrompts uploadedAt');

    // Build conversation context
    let conversationContext = '';
    if (recentHistory.length > 0) {
      conversationContext = '\n\n--- Recent Conversation Context ---\n';
      recentHistory.reverse().forEach((chat, index) => {
        conversationContext += `[${index + 1}] User: ${chat.userMessage.substring(0, 150)}${chat.userMessage.length > 150 ? '...' : ''}\n`;
        conversationContext += `[${index + 1}] Assistant: ${chat.aiResponse.substring(0, 150)}${chat.aiResponse.length > 150 ? '...' : ''}\n\n`;
      });
      conversationContext += '--- End of Context ---\n\n';
      console.log(`🧠 Added context from ${recentHistory.length} recent exchanges`);
    }

    // Build other files context
    let otherFilesContext = '';
    if (otherFiles.length > 0) {
      otherFilesContext = '\n\n--- Other Files in Session ---\n';
      otherFiles.forEach((otherFile, index) => {
        otherFilesContext += `File ${index + 1}: "${otherFile.originalName}" (uploaded ${new Date(otherFile.uploadedAt).toLocaleDateString()})\n`;
        if (otherFile.analysisPrompts && otherFile.analysisPrompts.length > 0) {
          const lastAnalysis = otherFile.analysisPrompts[otherFile.analysisPrompts.length - 1];
          otherFilesContext += `  Last analysis: "${lastAnalysis.prompt}"\n`;
        }
      });
      otherFilesContext += '--- End of Other Files ---\n\n';
      console.log(`📁 Added context from ${otherFiles.length} other files`);
    }

    // Create analysis prompt with file content and context
    const fileInfo = `File Name: ${file.originalName}\nFile Type: ${file.mimetype}\nFile Size: ${file.size} bytes\n`;
    const contentPreview = file.content.length > 8000 ? 
      file.content.substring(0, 8000) + '\n\n[Content truncated - showing first 8,000 characters]' : 
      file.content;
    
    const analysisMessage = `${conversationContext}${otherFilesContext}Please analyze the following file based on this request: "${prompt}"\n\n${fileInfo}\nFile Content:\n${contentPreview}

Please provide a comprehensive analysis while being aware of our conversation context and any other files in this session. If relevant, reference previous discussions or other files.`;

    // Use existing provider handlers
    const handler = providerHandlers[provider];
    if (!handler) {
      console.log(`❌ Unsupported provider: ${provider}`);
      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    }

    console.log(`🚀 Starting analysis with ${provider}/${model}`);
    const startTime = Date.now();
    const result = await handler(analysisMessage, model);
    const responseTime = Date.now() - startTime;

    console.log(`✅ Analysis completed in ${responseTime}ms`);

    // Save analysis to file record
    file.analysisPrompts.push({
      prompt,
      response: result.response,
      model: result.actualModel,
      provider: result.provider
    });
    await file.save();

    // Save to chat history as well
    const userMessage = `📄 Analyze "${file.originalName}": ${prompt}`;
    const aiResponse = result.response;
    
    console.log(`💾 Saving file analysis to chat history...`);
    await saveChatHistory(
      file.sessionId, 
      userMessage, 
      aiResponse, 
      result.actualModel, 
      result.provider, 
      responseTime, 
      result.status, 
      req
    );

    console.log(`💾 Analysis saved to file record and chat history`);

    res.json({
      response: result.response,
      model: result.actualModel,
      provider: result.provider,
      status: result.status,
      fileId,
      fileName: file.originalName,
      analysisId: file.analysisPrompts[file.analysisPrompts.length - 1]._id,
      timestamp: new Date().toISOString(),
      contextUsed: {
        conversationHistory: recentHistory.length > 0,
        otherFiles: otherFiles.length > 0,
        historyCount: recentHistory.length,
        otherFilesCount: otherFiles.length
      }
    });
  } catch (error) {
    console.error('❌ Error analyzing file:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to analyze file', message: error.message });
  }
});

// Get file analysis history
app.get('/api/file-analysis/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await FileUpload.findById(fileId)
      .select('originalName analysisPrompts uploadedAt');

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      fileId,
      fileName: file.originalName,
      uploadedAt: file.uploadedAt,
      analyses: file.analysisPrompts
    });
  } catch (error) {
    console.error('❌ Error fetching file analysis:', error.message);
    res.status(500).json({ error: 'Failed to fetch file analysis', message: error.message });
  }
});

// Delete uploaded file
app.delete('/api/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const result = await FileUpload.findByIdAndDelete(fileId);

    if (!result) {
      return res.status(404).json({ error: 'File not found' });
    }

    console.log(`🗑️  Deleted file: ${result.originalName} | ID: ${fileId}`);

    res.json({
      message: 'File deleted successfully',
      fileName: result.originalName,
      fileId
    });
  } catch (error) {
    console.error('❌ Error deleting file:', error.message);
    res.status(500).json({ error: 'Failed to delete file', message: error.message });
  }
});

app.listen(5000, () => {
  console.log('🚀 Server running on port 5000');
  console.log('📊 Model usage monitoring enabled');
  console.log('📋 Supported providers:', Object.keys(providerHandlers));
  
  // Show API key status
  console.log('\n🔑 API Key Status:');
  console.log(`🤖 Google AI: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🧠 OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🎭 Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  
  console.log('\n📚 Available Models:');
  Object.entries(supportedModels).forEach(([provider, config]) => {
    const icon = provider === 'google' ? '🤖' : 
                 provider === 'openai' ? '🧠' : 
                 provider === 'anthropic' ? '🎭' : 
                 provider === 'cohere' ? '🔮' : '🤗';
    console.log(`${icon} ${provider}: ${config.models.join(', ')} (${config.status})`);
  });
  
  console.log('\n📈 Monitoring endpoints:');
  console.log('   GET /api/health - Server health and API status');
  console.log('   GET /api/models - Available models');
  console.log('   GET /api/stats - Usage statistics');
  console.log('\n' + '='.repeat(80));
});