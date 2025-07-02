import { genAI, openai, anthropic } from '../config/ai-clients.js';
import { logModelUsage } from '../utils/logger.js';

// Provider handlers
export const providerHandlers = {
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