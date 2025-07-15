import { llmAdapter } from '../services/aiService.js';
import { logModelUsage } from '../utils/logger.js';

/**
 * Process a single CSV file with AI analysis
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const processCSV = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { csvContent, promptTemplate, modelName, options = {} } = req.body;

    console.log('\n📊 CSV PROCESSING REQUEST');
    console.log(`📄 CSV Content Length: ${csvContent?.length || 0} characters`);
    console.log(`💭 Prompt Template: ${promptTemplate?.substring(0, 100)}${promptTemplate?.length > 100 ? '...' : ''}`);
    console.log(`🎯 Model: ${modelName}`);
    console.log(`⚙️ Options:`, options);

    // Validation
    if (!csvContent || !csvContent.trim()) {
      return res.status(400).json({ error: 'CSV content is required' });
    }

    if (!promptTemplate || typeof promptTemplate !== 'string') {
      return res.status(400).json({ error: 'Prompt template is required and must be a string' });
    }

    if (!modelName) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    // Initialize Ollama adapter if not already initialized
    if (!llmAdapter.getStatus().initialized) {
      console.log('🦙 Initializing Ollama adapter for CSV processing...');
      await llmAdapter.initializeModel({
        modelPath: modelName,
        batchSize: parseInt(process.env.OLLAMA_BATCH_SIZE || '10'),
        parameters: {
          temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7'),
          top_p: parseFloat(process.env.OLLAMA_TOP_P || '0.9'),
          top_k: parseInt(process.env.OLLAMA_TOP_K || '40'),
          repeat_penalty: parseFloat(process.env.OLLAMA_REPEAT_PENALTY || '1.1')
        }
      });
    }

    // Create prompt template function
    const createPrompt = (row, index, headers) => {
      try {
        // Replace placeholders in the template
        let prompt = promptTemplate;
        
        // Replace {row} with JSON representation of the row
        prompt = prompt.replace(/\{row\}/g, JSON.stringify(row, null, 2));
        
        // Replace {index} with row index
        prompt = prompt.replace(/\{index\}/g, index.toString());
        
        // Replace {headers} with headers array
        prompt = prompt.replace(/\{headers\}/g, JSON.stringify(headers, null, 2));
        
        // Replace individual column placeholders
        headers.forEach(header => {
          const placeholder = `{${header}}`;
          const value = row[header] || '';
          prompt = prompt.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        });
        
        return prompt;
      } catch (error) {
        throw new Error(`Failed to create prompt for row ${index}: ${error.message}`);
      }
    };

    // Process CSV with batch generation
    const result = await llmAdapter.processCSVWithBatchGeneration(
      csvContent,
      createPrompt,
      {
        ...options,
        startTime,
        batchSize: parseInt(process.env.OLLAMA_BATCH_SIZE || '10')
      }
    );

    const totalTime = Date.now() - startTime;
    console.log(`✅ CSV processing completed in ${totalTime}ms`);
    console.log(`📊 Processed ${result.summary.totalRows} rows`);
    console.log(`✅ Successful: ${result.summary.successfulRows}`);
    console.log(`❌ Errors: ${result.summary.errorRows}`);

    // Log usage
    logModelUsage('ollama', modelName, 'success', totalTime);

    res.json({
      success: true,
      model: modelName,
      provider: 'ollama',
      results: result.results,
      summary: result.summary,
      csvData: {
        headers: result.csvData.headers,
        totalRows: result.csvData.totalRows,
        totalColumns: result.csvData.totalColumns
      },
      processingTime: totalTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ CSV processing failed after ${totalTime}ms:`, error.message);
    
    logModelUsage('ollama', req.body.modelName || 'unknown', 'error', totalTime, error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      processingTime: totalTime,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Batch process multiple CSV files or large datasets
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const batchProcessCSV = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { csvFiles, promptTemplate, modelName, options = {} } = req.body;

    console.log('\n📊 BATCH CSV PROCESSING REQUEST');
    console.log(`📁 Number of CSV files: ${csvFiles?.length || 0}`);
    console.log(`💭 Prompt Template: ${promptTemplate?.substring(0, 100)}${promptTemplate?.length > 100 ? '...' : ''}`);
    console.log(`🎯 Model: ${modelName}`);

    // Validation
    if (!csvFiles || !Array.isArray(csvFiles) || csvFiles.length === 0) {
      return res.status(400).json({ error: 'CSV files array is required and must not be empty' });
    }

    if (!promptTemplate || typeof promptTemplate !== 'string') {
      return res.status(400).json({ error: 'Prompt template is required and must be a string' });
    }

    if (!modelName) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    // Initialize Ollama adapter if not already initialized
    if (!llmAdapter.getStatus().initialized) {
      console.log('🦙 Initializing Ollama adapter for batch CSV processing...');
      await llmAdapter.initializeModel({
        modelPath: modelName,
        batchSize: parseInt(process.env.OLLAMA_BATCH_SIZE || '10'),
        parameters: {
          temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7'),
          top_p: parseFloat(process.env.OLLAMA_TOP_P || '0.9'),
          top_k: parseInt(process.env.OLLAMA_TOP_K || '40'),
          repeat_penalty: parseFloat(process.env.OLLAMA_REPEAT_PENALTY || '1.1')
        }
      });
    }

    // Create prompt template function
    const createPrompt = (row, index, headers) => {
      try {
        let prompt = promptTemplate;
        prompt = prompt.replace(/\{row\}/g, JSON.stringify(row, null, 2));
        prompt = prompt.replace(/\{index\}/g, index.toString());
        prompt = prompt.replace(/\{headers\}/g, JSON.stringify(headers, null, 2));
        
        headers.forEach(header => {
          const placeholder = `{${header}}`;
          const value = row[header] || '';
          prompt = prompt.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        });
        
        return prompt;
      } catch (error) {
        throw new Error(`Failed to create prompt for row ${index}: ${error.message}`);
      }
    };

    // Process each CSV file
    const batchResults = [];
    let totalRows = 0;
    let totalSuccessful = 0;
    let totalErrors = 0;

    for (let i = 0; i < csvFiles.length; i++) {
      const csvFile = csvFiles[i];
      console.log(`📄 Processing CSV file ${i + 1}/${csvFiles.length}: ${csvFile.name || `File ${i + 1}`}`);
      
      try {
        const result = await llmAdapter.processCSVWithBatchGeneration(
          csvFile.content,
          createPrompt,
          {
            ...options,
            startTime,
            batchSize: parseInt(process.env.OLLAMA_BATCH_SIZE || '10')
          }
        );

        batchResults.push({
          fileIndex: i,
          fileName: csvFile.name || `File ${i + 1}`,
          success: true,
          results: result.results,
          summary: result.summary,
          csvData: {
            headers: result.csvData.headers,
            totalRows: result.csvData.totalRows,
            totalColumns: result.csvData.totalColumns
          }
        });

        totalRows += result.summary.totalRows;
        totalSuccessful += result.summary.successfulRows;
        totalErrors += result.summary.errorRows;

      } catch (error) {
        console.error(`❌ Failed to process CSV file ${i + 1}:`, error.message);
        batchResults.push({
          fileIndex: i,
          fileName: csvFile.name || `File ${i + 1}`,
          success: false,
          error: error.message
        });
        totalErrors++;
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Batch CSV processing completed in ${totalTime}ms`);
    console.log(`📊 Total rows processed: ${totalRows}`);
    console.log(`✅ Total successful: ${totalSuccessful}`);
    console.log(`❌ Total errors: ${totalErrors}`);

    // Log usage
    logModelUsage('ollama', modelName, 'success', totalTime);

    res.json({
      success: true,
      model: modelName,
      provider: 'ollama',
      batchResults,
      summary: {
        totalFiles: csvFiles.length,
        successfulFiles: batchResults.filter(r => r.success).length,
        failedFiles: batchResults.filter(r => !r.success).length,
        totalRows,
        totalSuccessful,
        totalErrors,
        processingTime: totalTime
      },
      processingTime: totalTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Batch CSV processing failed after ${totalTime}ms:`, error.message);
    
    logModelUsage('ollama', req.body.modelName || 'unknown', 'error', totalTime, error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      processingTime: totalTime,
      timestamp: new Date().toISOString()
    });
  }
}; 