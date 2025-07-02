import fs from 'fs';
import FileUpload from '../models/FileUpload.js';
import ChatHistory from '../models/ChatHistory.js';
import { readFileContent } from '../utils/fileReader.js';
import { providerHandlers } from '../services/aiService.js';

// Save chat to database (reused from chat controller)
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

export const uploadFile = async (req, res) => {
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
};

export const getFiles = async (req, res) => {
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
};

export const analyzeFile = async (req, res) => {
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
};

export const getFileAnalysis = async (req, res) => {
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
};

export const deleteFile = async (req, res) => {
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
}; 