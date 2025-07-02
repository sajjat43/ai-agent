import ChatHistory from '../models/ChatHistory.js';
import FileUpload from '../models/FileUpload.js';
import { providerHandlers } from '../services/aiService.js';
import { supportedModels } from '../config/ai-clients.js';

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

export const chat = async (req, res) => {
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
          fileContext += `Last analysis: "${lastAnalysis.prompt}" - ${lastAnalysis.response?.substring(0, 200) || ''}${lastAnalysis.response && lastAnalysis.response.length > 200 ? '...' : ''}\n`;
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
};

export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, page = 1 } = req.query;
    
    const limitNum = parseInt(limit.toString());
    const pageNum = parseInt(page.toString());
    
    const chats = await ChatHistory.find({ sessionId })
      .sort({ timestamp: 1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .select('userMessage aiResponse model provider status responseTime timestamp');
    
    const totalChats = await ChatHistory.countDocuments({ sessionId });
    
    console.log(`📚 Retrieved ${chats.length} chat records for session: ${sessionId}`);
    
    res.json({
      sessionId,
      chats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalChats,
        pages: Math.ceil(totalChats / limitNum)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching chat history:', error.message);
    res.status(500).json({ error: 'Failed to fetch chat history', message: error.message });
  }
};

export const getAllSessions = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    
    const limitNum = parseInt(limit.toString());
    const pageNum = parseInt(page.toString());
    
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
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum }
    ]);
    
    const totalSessions = await ChatHistory.distinct('sessionId').then(sessions => sessions.length);
    
    console.log(`📋 Retrieved ${sessions.length} sessions`);
    
    res.json({
      sessions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalSessions,
        pages: Math.ceil(totalSessions / limitNum)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching sessions:', error.message);
    res.status(500).json({ error: 'Failed to fetch sessions', message: error.message });
  }
};

export const deleteChatHistory = async (req, res) => {
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
}; 