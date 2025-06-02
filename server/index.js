import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Provider handlers
const providerHandlers = {
  google: async (message, modelName) => {
    try {
      // Support different Gemini models
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(message);
      const response = await result.response.text();
      return {
        response,
        actualModel: modelName,
        provider: 'google',
        status: 'success'
      };
    } catch (err) {
      throw new Error(`Google AI Error (${modelName}): ` + err.message);
    }
  },
  
  openai: async (message, modelName) => {
    // Placeholder for OpenAI integration
    // To enable real OpenAI responses, install openai package and add API key
    /*
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    try {
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: message }],
        model: modelName,
      });
      return {
        response: completion.choices[0].message.content,
        actualModel: modelName,
        provider: 'openai',
        status: 'success'
      };
    } catch (err) {
      throw new Error(`OpenAI Error (${modelName}): ` + err.message);
    }
    */
    
    return {
      response: `🤖 ${modelName}: I'm a simulated response to "${message}". To enable real ${modelName} responses, please:\n\n1. Install the OpenAI package: npm install openai\n2. Add your OPENAI_API_KEY to the .env file\n3. Uncomment the OpenAI integration code in server/index.js\n\nThis would connect to the actual ${modelName} model.`,
      actualModel: modelName,
      provider: 'openai',
      status: 'simulated'
    };
  },
  
  anthropic: async (message, modelName) => {
    // Placeholder for Anthropic integration
    // To enable real Claude responses, install @anthropic-ai/sdk package and add API key
    /*
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    try {
      const msg = await anthropic.messages.create({
        model: modelName,
        max_tokens: 1000,
        messages: [{ role: "user", content: message }],
      });
      return {
        response: msg.content[0].text,
        actualModel: modelName,
        provider: 'anthropic',
        status: 'success'
      };
    } catch (err) {
      throw new Error(`Anthropic Error (${modelName}): ` + err.message);
    }
    */
    
    return {
      response: `🎭 ${modelName}: I'm a simulated response to "${message}". To enable real ${modelName} responses, please:\n\n1. Install the Anthropic SDK: npm install @anthropic-ai/sdk\n2. Add your ANTHROPIC_API_KEY to the .env file\n3. Uncomment the Anthropic integration code in server/index.js\n\nThis would connect to the actual ${modelName} model.`,
      actualModel: modelName,
      provider: 'anthropic',
      status: 'simulated'
    };
  }
};

// Model validation
const supportedModels = {
  google: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-pro-vision'],
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
  anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-opus', 'claude-3-sonnet']
};

app.post('/api/chat', async (req, res) => {
  const { message, model, provider } = req.body;

  // Validation
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!model || !provider) {
    return res.status(400).json({ error: 'Model and provider are required' });
  }

  // Check if provider is supported
  if (!providerHandlers[provider]) {
    return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  }

  // Check if model is supported for the provider
  if (!supportedModels[provider] || !supportedModels[provider].includes(model)) {
    console.warn(`Model ${model} not in supported list for ${provider}, attempting anyway...`);
  }

  try {
    const handler = providerHandlers[provider];
    const result = await handler(message, model);
    
    res.json({
      response: result.response,
      model: result.actualModel,
      provider: result.provider,
      status: result.status,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(`${provider} API Error (${model}):`, err);
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
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supportedProviders: Object.keys(providerHandlers),
    supportedModels
  });
});

// Get available models endpoint
app.get('/api/models', (req, res) => {
  res.json({
    providers: Object.keys(supportedModels).map(provider => ({
      name: provider,
      models: supportedModels[provider],
      status: provider === 'google' ? 'active' : 'simulated'
    }))
  });
});

app.listen(5000, () => {
  console.log('🚀 Server running on port 5000');
  console.log('📋 Supported providers:', Object.keys(providerHandlers));
  console.log('🤖 Google AI models:', supportedModels.google);
  console.log('🧠 OpenAI models (simulated):', supportedModels.openai);
  console.log('🎭 Anthropic models (simulated):', supportedModels.anthropic);
});
