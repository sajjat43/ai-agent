#!/usr/bin/env node

/**
 * Test script for the LLM Adapter
 * This script tests the basic functionality of the llm-adapter module
 */

import llmAdapter from '../src/services/llm-adapter.js';

async function testLLMAdapter() {
  console.log('🧪 Testing LLM Adapter...\n');

  try {
    // Test 1: Initialize the adapter
    console.log('1️⃣ Testing initialization...');
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
    console.log('✅ Initialization successful\n');

    // Test 2: Basic text generation
    console.log('2️⃣ Testing basic text generation...');
    const response = await llmAdapter.generateText('Hello, how are you?', {
      maxTokens: 100
    });
    console.log('✅ Text generation successful');
    console.log('Response:', response.substring(0, 100) + '...\n');

    // Test 3: Batch generation
    console.log('3️⃣ Testing batch generation...');
    const prompts = [
      'What is the capital of France?',
      'Explain quantum computing in one sentence',
      'Write a haiku about programming'
    ];
    
    const batchResponses = await llmAdapter.batchGenerate(prompts, {
      temperature: 0.8,
      maxTokens: 150
    });
    
    console.log('✅ Batch generation successful');
    batchResponses.forEach((response, index) => {
      console.log(`Response ${index + 1}:`, response.substring(0, 100) + '...');
    });
    console.log();

    // Test 4: CSV processing
    console.log('4️⃣ Testing CSV processing...');
    const csvContent = `name,age,city
John,25,New York
Jane,30,Los Angeles
Bob,35,Chicago`;

    const promptTemplate = `Analyze this person's data:
Name: {name}
Age: {age}
City: {city}

Provide a brief insight about this person.`;

    const csvResult = await llmAdapter.processCSVWithBatchGeneration(
      csvContent,
      (row, index, headers) => {
        return promptTemplate
          .replace(/{name}/g, row.name)
          .replace(/{age}/g, row.age)
          .replace(/{city}/g, row.city);
      },
      {
        temperature: 0.7,
        batchSize: 3
      }
    );

    console.log('✅ CSV processing successful');
    console.log('Summary:', csvResult.summary);
    csvResult.results.forEach((result, index) => {
      console.log(`Row ${index + 1} (${result.status}):`, result.response.substring(0, 100) + '...');
    });
    console.log();

    // Test 5: Status check
    console.log('5️⃣ Testing status check...');
    const status = llmAdapter.getStatus();
    console.log('✅ Status check successful');
    console.log('Status:', status);
    console.log();

    console.log('🎉 All tests passed! LLM Adapter is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testLLMAdapter().catch(console.error); 