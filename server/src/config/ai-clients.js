import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Supported models configuration
export const supportedModels = {
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

export { genAI, openai, anthropic }; 