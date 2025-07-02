import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './src/config/database.js';
import chatRoutes from './src/routes/chatRoutes.js';
import fileRoutes from './src/routes/fileRoutes.js';
import systemRoutes from './src/routes/systemRoutes.js';
import { supportedModels } from './src/config/ai-clients.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to database
connectDB();

// Routes
app.use('/api', chatRoutes);
app.use('/api', fileRoutes);
app.use('/api', systemRoutes);

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('🚀 Server running on port', PORT);
  console.log('📊 Model usage monitoring enabled');
  console.log('📋 Supported providers:', Object.keys(supportedModels));
  
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
}).on('error', (err) => {
  if (err && typeof err === 'object' && 'code' in err && err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please try a different port or kill the process using this port.`);
    console.error(`💡 You can run: lsof -ti:${PORT} | xargs kill -9`);
    process.exit(1);
  } else {
    console.error('❌ Server failed to start:', err.message);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});