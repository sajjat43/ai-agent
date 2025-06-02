import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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
        max_tokens: 1000,
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
        max_tokens: 1000,
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

app.post('/api/chat', async (req, res) => {
  const { message, model, provider } = req.body;
  const requestStart = Date.now();

  console.log('\n🔄 NEW REQUEST');
  console.log(`📝 Message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
  console.log(`🎯 Requested Model: ${model}`);
  console.log(`🏢 Provider: ${provider.toUpperCase()}`);
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
    const handler = providerHandlers[provider];
    const result = await handler(message, model);
    
    const totalTime = Date.now() - requestStart;
    console.log(`✅ Request completed in ${totalTime}ms | Model: ${result.actualModel} | Provider: ${result.provider.toUpperCase()}\n`);
    
    res.json({
      response: result.response,
      model: result.actualModel,
      provider: result.provider,
      status: result.status,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const totalTime = Date.now() - requestStart;
    console.error(`❌ Request failed after ${totalTime}ms | Model: ${model} | Provider: ${provider.toUpperCase()} | Error: ${err.message}\n`);
    logModelUsage(provider, model, 'error', totalTime, err);
    res.status(500).json({ 
      error: err.message,
      model,
      provider,
      status: 'error'
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
    }
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
app.get('/api/stats', (req, res) => {
  res.json({
    ...usageStats,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
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
