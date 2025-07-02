import mongoose from 'mongoose';
import ChatHistory from '../models/ChatHistory.js';
import { supportedModels } from '../config/ai-clients.js';
import { usageStats } from '../utils/logger.js';

export const healthCheck = (req, res) => {
  const providerStatus = {};
  Object.keys(supportedModels).forEach(provider => {
    providerStatus[provider] = supportedModels[provider].status;
  });

  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supportedProviders: Object.keys(supportedModels),
    providerStatus,
    apiKeys: {
      google: !!process.env.GEMINI_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY
    },
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
};

export const getModels = (req, res) => {
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
};

export const getStats = async (req, res) => {
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
}; 