// Usage tracking
export const usageStats = {
  totalRequests: 0,
  modelUsage: {},
  providerUsage: {},
  errors: {},
  requestHistory: []
};

// Logging utility
export const logModelUsage = (provider, model, status, responseTime, error = null) => {
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