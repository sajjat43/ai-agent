import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('gemini-1.5-flash');
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);
  const messagesEndRef = useRef(null);

  const agents = [
    // Google Models
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'google',
      color: '#4285f4',
      icon: '🤖',
      status: 'LIVE',
      description: 'Fast and efficient Google AI model'
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'google',
      color: '#4285f4',
      icon: '🤖',
      status: 'LIVE',
      description: 'Advanced Google AI model with enhanced capabilities'
    },
    
    // OpenAI Models
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      color: '#10a37f',
      icon: '🧠',
      status: 'LIVE',
      description: 'Most capable OpenAI model'
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      color: '#10a37f',
      icon: '🧠',
      status: 'LIVE',
      description: 'Faster and more efficient GPT-4'
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      color: '#10a37f',
      icon: '🧠',
      status: 'LIVE',
      description: 'Fast and cost-effective OpenAI model'
    },
    
    // Anthropic Models
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      color: '#cc785c',
      icon: '🎭',
      status: 'LIVE',
      description: 'Most powerful Claude model'
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      color: '#cc785c',
      icon: '🎭',
      status: 'LIVE',
      description: 'Balanced Claude model'
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      provider: 'anthropic',
      color: '#cc785c',
      icon: '🎭',
      status: 'LIVE',
      description: 'Fast and efficient Claude model'
    },
    
    // Other Models (Placeholders)
    {
      id: 'command',
      name: 'Cohere Command',
      provider: 'cohere',
      color: '#9333ea',
      icon: '🔮',
      status: 'COMING_SOON',
      description: 'Cohere\'s flagship model'
    },
    {
      id: 'microsoft/DialoGPT-large',
      name: 'DialoGPT Large',
      provider: 'huggingface',
      color: '#ff6b35',
      icon: '🤗',
      status: 'COMING_SOON',
      description: 'Hugging Face conversational model'
    }
  ];

  // Fetch server status on component mount
  useEffect(() => {
    fetchServerStatus();
  }, []);

  const fetchServerStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/health');
      const data = await response.json();
      setServerStatus(data);
    } catch (error) {
      console.error('Failed to fetch server status:', error);
    }
  };

  const getStatusBadge = (agent) => {
    if (!serverStatus) return { text: 'CHECKING', color: '#6b7280' };
    
    const providerStatus = serverStatus.providerStatus?.[agent.provider];
    const hasApiKey = serverStatus.apiKeys?.[agent.provider];
    
    if (providerStatus === 'active' && hasApiKey) {
      return { text: 'LIVE', color: '#10b981' };
    } else if (providerStatus === 'needs_key' || !hasApiKey) {
      return { text: 'NEEDS_KEY', color: '#f59e0b' };
    } else if (providerStatus === 'placeholder') {
      return { text: 'COMING_SOON', color: '#6b7280' };
    } else {
      return { text: 'UNKNOWN', color: '#ef4444' };
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    const selectedAgentData = agents.find(agent => agent.id === selectedAgent);
    
    // Add user message
    const newUserMessage = {
      id: Date.now(),
      text: userMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, newUserMessage]);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          model: selectedAgent,
          provider: selectedAgentData.provider
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        const aiMessage = {
          id: Date.now() + 1,
          text: data.response,
          sender: 'ai',
          agent: selectedAgentData,
          actualModel: data.model,
          provider: data.provider,
          status: data.status,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: `❌ Error: ${error.message}. Please check your connection and try again.`,
        sender: 'ai',
        agent: selectedAgentData,
        status: 'error',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const groupedAgents = () => {
    const groups = {};
    agents.forEach(agent => {
      if (!groups[agent.provider]) {
        groups[agent.provider] = [];
      }
      groups[agent.provider].push(agent);
    });
    return groups;
  };

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);
  const statusBadge = getStatusBadge(selectedAgentData);

  return (
    <div className="app">
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <div className="header-content">
            <div className="agent-info">
              <span className="agent-icon">{selectedAgentData.icon}</span>
              <div className="agent-details">
                <h1 className="agent-name">{selectedAgentData.name}</h1>
                <p className="agent-description">{selectedAgentData.description}</p>
              </div>
              <div className="status-badges">
                <span 
                  className="status-badge"
                  style={{ backgroundColor: statusBadge.color }}
                >
                  {statusBadge.text}
                </span>
                <span className="provider-badge" style={{ color: selectedAgentData.color }}>
                  {selectedAgentData.provider.toUpperCase()}
                </span>
              </div>
            </div>
            
            {/* Agent Selector */}
            <div className="agent-selector">
              <button 
                className="selector-button"
                onClick={() => setShowAgentSelector(!showAgentSelector)}
                style={{ borderColor: selectedAgentData.color }}
              >
                <span className="selector-icon">{selectedAgentData.icon}</span>
                <span className="selector-text">Switch Model</span>
                <span className="selector-arrow">▼</span>
              </button>
              
              {showAgentSelector && (
                <div className="selector-dropdown">
                  {Object.entries(groupedAgents()).map(([provider, providerAgents]) => (
                    <div key={provider} className="provider-group">
                      <div className="provider-header">
                        <span className="provider-name">{provider.toUpperCase()}</span>
                        {serverStatus && (
                          <span 
                            className="provider-status"
                            style={{ 
                              color: serverStatus.apiKeys?.[provider] ? '#10b981' : '#f59e0b' 
                            }}
                          >
                            {serverStatus.apiKeys?.[provider] ? '✅' : '🔑'}
                          </span>
                        )}
                      </div>
                      {providerAgents.map(agent => {
                        const agentStatus = getStatusBadge(agent);
                        return (
                          <button
                            key={agent.id}
                            className={`agent-option ${selectedAgent === agent.id ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedAgent(agent.id);
                              setShowAgentSelector(false);
                            }}
                            style={{ borderLeftColor: agent.color }}
                          >
                            <div className="option-content">
                              <span className="option-icon">{agent.icon}</span>
                              <div className="option-details">
                                <span className="option-name">{agent.name}</span>
                                <span className="option-description">{agent.description}</span>
                              </div>
                              <span 
                                className="option-status"
                                style={{ backgroundColor: agentStatus.color }}
                              >
                                {agentStatus.text}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="welcome-screen">
              <div className="welcome-content">
                <h2>🤖 AI Chat Interface</h2>
                <p>Select an AI model and start chatting!</p>
                
                <div className="status-guide">
                  <h3>Status Guide:</h3>
                  <div className="status-item">
                    <span className="status-badge" style={{ backgroundColor: '#10b981' }}>LIVE</span>
                    <span>Real AI model with API key configured</span>
                  </div>
                  <div className="status-item">
                    <span className="status-badge" style={{ backgroundColor: '#f59e0b' }}>NEEDS_KEY</span>
                    <span>Model available but requires API key</span>
                  </div>
                  <div className="status-item">
                    <span className="status-badge" style={{ backgroundColor: '#6b7280' }}>COMING_SOON</span>
                    <span>Integration planned for future release</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.sender}`}>
              {message.sender === 'ai' && (
                <div className="message-header">
                  <span className="message-agent-icon">{message.agent.icon}</span>
                  <span className="message-agent-name">
                    {message.actualModel || message.agent.name}
                  </span>
                  {message.status && (
                    <span 
                      className="message-status"
                      style={{ 
                        backgroundColor: message.status === 'success' ? '#10b981' : 
                                       message.status === 'error' ? '#ef4444' : '#6b7280'
                      }}
                    >
                      {message.status.toUpperCase()}
                    </span>
                  )}
                  <span className="message-time">{message.timestamp}</span>
                </div>
              )}
              <div className="message-content">
                <div className="message-text">{message.text}</div>
                {message.sender === 'user' && (
                  <span className="message-time">{message.timestamp}</span>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message ai">
              <div className="message-header">
                <span className="message-agent-icon">{selectedAgentData.icon}</span>
                <span className="message-agent-name">{selectedAgentData.name}</span>
                <span className="message-status loading">THINKING</span>
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-container">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Message ${selectedAgentData.name}...`}
              className="message-input"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="send-button"
              disabled={isLoading || !inputMessage.trim()}
              style={{ backgroundColor: selectedAgentData.color }}
            >
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
          <div className="input-hint">
            Press Enter to send • Currently using: <strong>{selectedAgentData.name}</strong>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App; 