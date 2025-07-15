import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * LLM Adapter for Ollama integration
 * Provides a JavaScript interface to interact with Ollama CLI
 */
class LLMAdapter {
  constructor() {
    this.modelConfig = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the model with configuration
   * @param {Object} config - Configuration object
   * @param {string} config.modelPath - Path to the Ollama model or model name
   * @param {number} config.batchSize - Batch size for processing (default: 10)
   * @param {Object} config.parameters - Model parameters (temperature, top_p, etc.)
   * @returns {Promise<boolean>} - Success status
   */
  async initializeModel(config = {}) {
    try {
      console.log('🦙 Initializing Ollama LLM Adapter...');
      
      // Set default configuration
      this.modelConfig = {
        modelPath: config.modelPath || process.env.OLLAMA_MODEL_PATH || 'llama2',
        batchSize: config.batchSize || parseInt(process.env.OLLAMA_BATCH_SIZE) || 10,
        parameters: {
          temperature: config.parameters?.temperature || parseFloat(process.env.OLLAMA_TEMPERATURE) || 0.7,
          top_p: config.parameters?.top_p || parseFloat(process.env.OLLAMA_TOP_P) || 0.9,
          top_k: config.parameters?.top_k || parseInt(process.env.OLLAMA_TOP_K) || 40,
          repeat_penalty: config.parameters?.repeat_penalty || parseFloat(process.env.OLLAMA_REPEAT_PENALTY) || 1.1,
          ...config.parameters
        }
      };

      // Check if Ollama is available
      await this.checkOllamaAvailability();
      
      // Check if model is available, pull if not
      await this.ensureModelAvailable(this.modelConfig.modelPath);
      
      this.isInitialized = true;
      console.log(`✅ Ollama LLM Adapter initialized with model: ${this.modelConfig.modelPath}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Ollama LLM Adapter:', error.message);
      throw error;
    }
  }

  /**
   * Check if Ollama CLI is available
   * @returns {Promise<boolean>} - Availability status
   */
  async checkOllamaAvailability() {
    return new Promise((resolve, reject) => {
      const ollama = spawn('ollama', ['--version']);
      
      ollama.on('error', (error) => {
        reject(new Error(`Ollama CLI not found: ${error.message}. Please install Ollama from https://ollama.ai`));
      });
      
      ollama.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`Ollama CLI check failed with code: ${code}`));
        }
      });
    });
  }

  /**
   * Ensure the specified model is available, pull if not
   * @param {string} modelName - Name of the model to check/pull
   * @returns {Promise<boolean>} - Success status
   */
  async ensureModelAvailable(modelName) {
    return new Promise((resolve, reject) => {
      console.log(`🔍 Checking if model '${modelName}' is available...`);
      
      const listProcess = spawn('ollama', ['list']);
      let output = '';
      
      listProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      listProcess.on('close', async (code) => {
        if (code === 0) {
          const modelAvailable = output.includes(modelName);
          
          if (modelAvailable) {
            console.log(`✅ Model '${modelName}' is already available`);
            resolve(true);
          } else {
            console.log(`📥 Model '${modelName}' not found, pulling...`);
            try {
              await this.pullModel(modelName);
              resolve(true);
            } catch (error) {
              reject(error);
            }
          }
        } else {
          reject(new Error(`Failed to list Ollama models: ${code}`));
        }
      });
      
      listProcess.on('error', (error) => {
        reject(new Error(`Failed to check model availability: ${error.message}`));
      });
    });
  }

  /**
   * Pull a model from Ollama
   * @param {string} modelName - Name of the model to pull
   * @returns {Promise<boolean>} - Success status
   */
  async pullModel(modelName) {
    return new Promise((resolve, reject) => {
      console.log(`📥 Pulling model '${modelName}' from Ollama...`);
      
      const pullProcess = spawn('ollama', ['pull', modelName]);
      
      pullProcess.stdout.on('data', (data) => {
        console.log(`📥 ${data.toString().trim()}`);
      });
      
      pullProcess.stderr.on('data', (data) => {
        console.log(`📥 ${data.toString().trim()}`);
      });
      
      pullProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Model '${modelName}' pulled successfully`);
          resolve(true);
        } else {
          reject(new Error(`Failed to pull model '${modelName}': ${code}`));
        }
      });
      
      pullProcess.on('error', (error) => {
        reject(new Error(`Failed to pull model: ${error.message}`));
      });
    });
  }

  /**
   * Generate text using Ollama
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated text
   */
  async generateText(prompt, options = {}) {
    if (!this.isInitialized) {
      throw new Error('LLM Adapter not initialized. Call initializeModel() first.');
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Prepare Ollama command arguments
      const args = ['run', this.modelConfig.modelPath];
      
      // Add parameters
      Object.entries(this.modelConfig.parameters).forEach(([key, value]) => {
        args.push(`--${key.replace(/_/g, '-')}`, value.toString());
      });
      
      // Add custom options
      if (options.temperature !== undefined) {
        args.push('--temperature', options.temperature.toString());
      }
      if (options.maxTokens !== undefined) {
        args.push('--num-predict', options.maxTokens.toString());
      }
      
      console.log(`🤖 Generating text with Ollama (${this.modelConfig.modelPath})...`);
      
      const ollamaProcess = spawn('ollama', args);
      let output = '';
      let errorOutput = '';
      
      ollamaProcess.stdin.write(prompt);
      ollamaProcess.stdin.end();
      
      ollamaProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ollamaProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      ollamaProcess.on('close', (code) => {
        const responseTime = Date.now() - startTime;
        
        if (code === 0) {
          console.log(`✅ Text generated in ${responseTime}ms`);
          resolve(output.trim());
        } else {
          console.error(`❌ Ollama generation failed: ${errorOutput}`);
          reject(new Error(`Ollama generation failed with code ${code}: ${errorOutput}`));
        }
      });
      
      ollamaProcess.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        console.error(`❌ Ollama process error after ${responseTime}ms:`, error.message);
        reject(new Error(`Ollama process error: ${error.message}`));
      });
    });
  }

  /**
   * Generate text for multiple prompts in batches
   * @param {string[]} prompts - Array of prompts
   * @param {Object} options - Generation options
   * @returns {Promise<string[]>} - Array of generated texts
   */
  async batchGenerate(prompts, options = {}) {
    if (!this.isInitialized) {
      throw new Error('LLM Adapter not initialized. Call initializeModel() first.');
    }

    if (!Array.isArray(prompts) || prompts.length === 0) {
      throw new Error('Prompts must be a non-empty array');
    }

    console.log(`🔄 Batch generating ${prompts.length} prompts with batch size ${this.modelConfig.batchSize}...`);
    
    const results = [];
    const batchSize = options.batchSize || this.modelConfig.batchSize;
    
    // Process prompts in batches
    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(prompts.length / batchSize)} (${batch.length} prompts)`);
      
      // Process batch concurrently
      const batchPromises = batch.map(prompt => this.generateText(prompt, options));
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Handle results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`❌ Failed to generate text for prompt ${i + index}:`, result.reason.message);
          results.push(`[Error: ${result.reason.message}]`);
        }
      });
    }
    
    console.log(`✅ Batch generation completed. Generated ${results.length} responses.`);
    return results;
  }

  /**
   * Parse CSV content and extract rows for batch processing
   * @param {string} csvContent - CSV content as string
   * @param {Object} options - Parsing options
   * @returns {Promise<Object>} - Parsed CSV data with headers and rows
   */
  async parseCSV(csvContent, options = {}) {
    try {
      console.log('📊 Parsing CSV content...');
      
      const lines = csvContent.trim().split('\n');
      if (lines.length === 0) {
        throw new Error('Empty CSV content');
      }
      
      // Parse headers
      const headers = this.parseCSVLine(lines[0]);
      console.log(`📋 CSV headers: ${headers.join(', ')}`);
      
      // Parse data rows
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) { // Skip empty lines
          const rowData = this.parseCSVLine(line);
          const row = {};
          
          headers.forEach((header, index) => {
            row[header] = rowData[index] || '';
          });
          
          rows.push(row);
        }
      }
      
      console.log(`✅ CSV parsed successfully: ${rows.length} rows, ${headers.length} columns`);
      
      return {
        headers,
        rows,
        totalRows: rows.length,
        totalColumns: headers.length
      };
    } catch (error) {
      console.error('❌ CSV parsing failed:', error.message);
      throw new Error(`CSV parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse a single CSV line, handling quoted fields
   * @param {string} line - CSV line to parse
   * @returns {string[]} - Array of field values
   */
  parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        fields.push(currentField.trim());
        currentField = '';
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
    
    // Add the last field
    fields.push(currentField.trim());
    
    return fields;
  }

  /**
   * Process CSV rows with batch generation
   * @param {string} csvContent - CSV content as string
   * @param {Function} promptTemplate - Function to create prompt from row data
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Processing results
   */
  async processCSVWithBatchGeneration(csvContent, promptTemplate, options = {}) {
    try {
      console.log('🔄 Processing CSV with batch generation...');
      
      // Parse CSV
      const csvData = await this.parseCSV(csvContent, options);
      
      // Create prompts from rows
      const prompts = csvData.rows.map((row, index) => {
        try {
          return promptTemplate(row, index, csvData.headers);
        } catch (error) {
          console.error(`❌ Failed to create prompt for row ${index}:`, error.message);
          return `[Error creating prompt for row ${index}: ${error.message}]`;
        }
      });
      
      // Filter out error prompts
      const validPrompts = prompts.filter(prompt => !prompt.startsWith('[Error'));
      const errorRows = prompts.length - validPrompts.length;
      
      if (errorRows > 0) {
        console.warn(`⚠️ ${errorRows} rows had errors creating prompts`);
      }
      
      // Generate responses
      const responses = await this.batchGenerate(validPrompts, options);
      
      // Combine results
      const results = [];
      let responseIndex = 0;
      
      csvData.rows.forEach((row, index) => {
        if (prompts[index].startsWith('[Error')) {
          results.push({
            rowIndex: index,
            rowData: row,
            prompt: prompts[index],
            response: '[Error: Failed to create prompt]',
            status: 'error'
          });
        } else {
          results.push({
            rowIndex: index,
            rowData: row,
            prompt: prompts[index],
            response: responses[responseIndex],
            status: 'success'
          });
          responseIndex++;
        }
      });
      
      console.log(`✅ CSV processing completed: ${results.length} rows processed`);
      
      return {
        csvData,
        results,
        summary: {
          totalRows: results.length,
          successfulRows: results.filter(r => r.status === 'success').length,
          errorRows: results.filter(r => r.status === 'error').length,
          processingTime: Date.now() - (options.startTime || Date.now())
        }
      };
    } catch (error) {
      console.error('❌ CSV processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Get adapter status and configuration
   * @returns {Object} - Status information
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      modelConfig: this.modelConfig,
      adapter: 'ollama',
      version: '1.0.0'
    };
  }
}

// Create singleton instance
const llmAdapter = new LLMAdapter();

export default llmAdapter; 