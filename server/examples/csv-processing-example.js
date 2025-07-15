#!/usr/bin/env node

/**
 * CSV Processing Example
 * Demonstrates how to use the llm-adapter for CSV processing
 */

import fs from 'fs';
import path from 'path';
import llmAdapter from '../src/services/llm-adapter.js';

async function csvProcessingExample() {
  console.log('📊 CSV Processing Example\n');

  try {
    // Initialize the adapter
    console.log('🦙 Initializing Ollama adapter...');
    await llmAdapter.initializeModel({
      modelPath: 'llama2',
      batchSize: 5,
      parameters: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1
      }
    });
    console.log('✅ Adapter initialized\n');

    // Read sample CSV file
    const csvPath = path.join(process.cwd(), 'examples', 'sample-data.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    console.log('📄 Loaded sample CSV data');
    console.log('CSV content preview:');
    console.log(csvContent.split('\n').slice(0, 4).join('\n') + '...\n');

    // Example 1: Basic analysis
    console.log('🔍 Example 1: Basic Analysis');
    const basicResult = await llmAdapter.processCSVWithBatchGeneration(
      csvContent,
      (row, index, headers) => {
        return `Analyze this person's profile:
          Name: ${row.name}
          Age: ${row.age}
          City: ${row.city}
          Occupation: ${row.occupation}
          Salary: $${row.salary}

          Provide a brief analysis of this person's career and location.`;
      },
      {
        temperature: 0.7,
        batchSize: 3
      }
    );

    console.log('✅ Basic analysis completed');
    console.log('Summary:', basicResult.summary);
    console.log('Sample responses:');
    basicResult.results.slice(0, 3).forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.rowData.name}:`);
      console.log(result.response.substring(0, 200) + '...');
    });
    console.log();

    // Example 2: Salary analysis
    console.log('💰 Example 2: Salary Analysis');
    const salaryResult = await llmAdapter.processCSVWithBatchGeneration(
      csvContent,
      (row, index, headers) => {
        const salary = parseInt(row.salary);
        const age = parseInt(row.age);
        
        return `Salary Analysis for ${row.name}:
          - Age: ${age}
          - Salary: $${salary.toLocaleString()}
          - Occupation: ${row.occupation}
          - City: ${row.city}

          Based on this data, provide:
          1. Whether the salary is competitive for their age and location
          2. Potential career growth suggestions
          3. Cost of living considerations for their city`;
      },
      {
        temperature: 0.8,
        batchSize: 2
      }
    );

    console.log('✅ Salary analysis completed');
    console.log('Summary:', salaryResult.summary);
    console.log('Sample responses:');
    salaryResult.results.slice(0, 2).forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.rowData.name} ($${result.rowData.salary}):`);
      console.log(result.response.substring(0, 300) + '...');
    });
    console.log();

    // Example 3: Career advice
    console.log('🚀 Example 3: Career Advice');
    const careerResult = await llmAdapter.processCSVWithBatchGeneration(
      csvContent,
      (row, index, headers) => {
        const age = parseInt(row.age);
        const experience = age - 22; // Rough estimate of work experience
        
        return `Career Advice for ${row.name}:
          - Current Role: ${row.occupation}
          - Age: ${age} (estimated ${experience} years experience)
          - Location: ${row.city}
          - Current Salary: $${row.salary}

          Provide personalized career advice including:
          1. Next career steps
          2. Skills to develop
          3. Potential salary growth
          4. Location considerations`;
      },
      {
        temperature: 0.9,
        batchSize: 2
      }
    );

    console.log('✅ Career advice completed');
    console.log('Summary:', careerResult.summary);
    console.log('Sample responses:');
    careerResult.results.slice(0, 2).forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.rowData.name} (${result.rowData.occupation}):`);
      console.log(result.response.substring(0, 400) + '...');
    });
    console.log();

    // Example 4: Batch processing with custom logic
    console.log('🔄 Example 4: Batch Processing with Custom Logic');
    
    // Filter for high earners
    const highEarners = await llmAdapter.parseCSV(csvContent);
    const filteredRows = highEarners.rows.filter(row => parseInt(row.salary) > 80000);
    
    console.log(`Found ${filteredRows.length} high earners (salary > $80k)`);
    
    const highEarnerResult = await llmAdapter.batchGenerate(
      filteredRows.map(row => 
        `Analyze this high earner: ${row.name} (${row.occupation}) in ${row.city} earning $${row.salary}. 
        What factors likely contributed to their high salary?`
      ),
      {
        temperature: 0.7,
        maxTokens: 200
      }
    );

    console.log('✅ High earner analysis completed');
    highEarnerResult.forEach((response, index) => {
      console.log(`\n${index + 1}. ${filteredRows[index].name}:`);
      console.log(response.substring(0, 200) + '...');
    });
    console.log();

    console.log('🎉 All CSV processing examples completed successfully!');
    console.log('\n📈 Performance Summary:');
    console.log(`- Total rows processed: ${basicResult.summary.totalRows}`);
    console.log(`- Successful operations: ${basicResult.summary.successfulRows}`);
    console.log(`- Failed operations: ${basicResult.summary.errorRows}`);
    console.log(`- Total processing time: ${basicResult.summary.processingTime}ms`);

  } catch (error) {
    console.error('❌ Example failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the example
csvProcessingExample().catch(console.error); 