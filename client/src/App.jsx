import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('gemini-1.5-flash');
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const messagesEndRef = useRef(null);

  const agents = [
    { 
      id: 'gemini-1.5-flash', 
      name: 'Gemini 1.5 Flash', 
      provider: 'google',
      color: '#4285f4',
      icon: '🤖',
      status: 'active',
      description: 'Google Gemini 1.5 Flash'
    },
    { 
      id: 'gemini-1.5-pro', 
      name: 'Gemini 1.5 Pro', 
      provider: 'google',
      color: '#4285f4',
      icon: '🚀',
      status: 'active',
      description: 'Google Gemini 1.5 Pro'
    },
    { 
      id: 'gpt-4', 
      name: 'GPT-4', 
      provider: 'openai',
      color: '#10a37f',
      icon: '🧠',
      status: 'simulated',
      description: 'OpenAI GPT-4'
    },
    { 
      id: 'gpt-3.5-turbo', 
      name: 'GPT-3.5 Turbo', 
      provider: 'openai',
      color: '#10a37f',
      icon: '⚡',
      status: 'simulated',
      description: 'OpenAI GPT-3.5 Turbo'
    },
    { 
      id: 'claude-3-opus', 
      name: 'Claude 3 Opus', 
      provider: 'anthropic',
      color: '#ff6b35',
      icon: '🎭',
      status: 'simulated',
      description: 'Anthropic Claude 3 Opus'
    },
    { 
      id: 'claude-3-sonnet', 
      name: 'Claude 3 Sonnet', 
      provider: 'anthropic',
      color: '#ff6b35',
      icon: '🎨',
      status: 'simulated',
      description: 'Anthropic Claude 3 Sonnet'
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    
    const userMessage = { id: Date.now(), text: inputMessage, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/chat', { 
        message: messageToSend,
        model: selectedAgent,
        provider: currentAgent.provider
      });
      
      const aiMessage = { 
        id: Date.now() + 1, 
        text: res.data.response, 
        sender: 'ai',
        model: selectedAgent,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { 
        id: Date.now() + 1, 
        text: 'Sorry, I encountered an error. Please try again.', 
        sender: 'ai',
        model: selectedAgent,
        isError: true,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const currentAgent = agents.find(agent => agent.id === selectedAgent);

  const getStatusBadge = (status) => {
    const badges = {
      active: { text: 'LIVE', color: '#22c55e', bgColor: '#dcfce7' },
      simulated: { text: 'DEMO', color: '#f59e0b', bgColor: '#fef3c7' },
      placeholder: { text: 'MOCK', color: '#6b7280', bgColor: '#f3f4f6' }
    };
    return badges[status] || badges.placeholder;
  };

  const groupedAgents = agents.reduce((acc, agent) => {
    if (!acc[agent.provider]) {
      acc[agent.provider] = [];
    }
    acc[agent.provider].push(agent);
    return acc;
  }, {});

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f7f7f8',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header with Cat Agent Selector */}
      <div style={{
        position: 'relative',
        padding: '1rem 2rem',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e5e5',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '1.5rem', 
            color: '#333',
            fontWeight: '600'
          }}>
            AI Chat Assistant
          </h1>
          <div style={{
            fontSize: '0.8rem',
            color: '#666',
            marginTop: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>Currently using:</span>
            <span style={{ 
              color: currentAgent.color, 
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              {currentAgent.icon} {currentAgent.description}
            </span>
            <span style={{
              ...getStatusBadge(currentAgent.status),
              padding: '0.125rem 0.375rem',
              borderRadius: '0.25rem',
              fontSize: '0.7rem',
              fontWeight: '600',
              backgroundColor: getStatusBadge(currentAgent.status).bgColor,
              color: getStatusBadge(currentAgent.status).color
            }}>
              {getStatusBadge(currentAgent.status).text}
            </span>
            <span style={{
              fontSize: '0.7rem',
              color: '#999',
              backgroundColor: '#f3f4f6',
              padding: '0.125rem 0.375rem',
              borderRadius: '0.25rem'
            }}>
              Model: {selectedAgent}
            </span>
          </div>
        </div>
        
        {/* Cat Agent Selector */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAgentSelector(!showAgentSelector)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: currentAgent.color,
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            <span style={{ fontSize: '1.3rem' }}>🐱</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span>{currentAgent.name}</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                {getStatusBadge(currentAgent.status).text}
              </span>
            </div>
            <span style={{ fontSize: '0.8rem' }}>▼</span>
          </button>
          
          {showAgentSelector && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              backgroundColor: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              zIndex: 1000,
              minWidth: '320px',
              maxHeight: '600px',
              overflowY: 'auto',
              overflow: 'hidden'
            }}>
              {Object.entries(groupedAgents).map(([provider, providerAgents]) => (
                <div key={provider}>
                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {provider === 'google' ? '🔵 Google' : 
                     provider === 'openai' ? '🟢 OpenAI' : 
                     provider === 'anthropic' ? '🟠 Anthropic' : provider}
                  </div>
                  {providerAgents.map(agent => {
                    const statusBadge = getStatusBadge(agent.status);
                    return (
                      <button
                        key={agent.id}
                        onClick={() => {
                          setSelectedAgent(agent.id);
                          setShowAgentSelector(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '1rem',
                          border: 'none',
                          backgroundColor: selectedAgent === agent.id ? '#f8fafc' : 'white',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          fontSize: '0.9rem',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedAgent !== agent.id) {
                            e.target.style.backgroundColor = '#f8fafc';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedAgent !== agent.id) {
                            e.target.style.backgroundColor = 'white';
                          }
                        }}
                      >
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: agent.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem'
                        }}>
                          {selectedAgent === agent.id ? '✓' : ''}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontWeight: '600', 
                            color: '#1f2937',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <span>{agent.icon}</span>
                            <span>{agent.name}</span>
                            <span style={{
                              ...statusBadge,
                              padding: '0.125rem 0.375rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.65rem',
                              fontWeight: '600',
                              backgroundColor: statusBadge.bgColor,
                              color: statusBadge.color
                            }}>
                              {statusBadge.text}
                            </span>
                          </div>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: '#6b7280',
                            marginTop: '0.125rem'
                          }}>
                            Model: {agent.id}
                          </div>
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

      {/* Chat Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#666',
            marginTop: '2rem'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🐱</div>
            <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Welcome to AI Chat!</h2>
            <p style={{ margin: 0, marginBottom: '1rem' }}>Select an AI model from the cat menu above and start chatting.</p>
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '8px',
              padding: '1rem',
              maxWidth: '500px',
              margin: '0 auto',
              textAlign: 'left'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#0369a1' }}>Model Status Guide:</h3>
              <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                <div style={{ marginBottom: '0.25rem' }}>
                  <span style={{ 
                    backgroundColor: '#dcfce7', 
                    color: '#22c55e', 
                    padding: '0.125rem 0.375rem', 
                    borderRadius: '0.25rem',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    marginRight: '0.5rem'
                  }}>LIVE</span>
                  Real AI model responding with actual API
                </div>
                <div style={{ marginBottom: '0.25rem' }}>
                  <span style={{ 
                    backgroundColor: '#fef3c7', 
                    color: '#f59e0b', 
                    padding: '0.125rem 0.375rem', 
                    borderRadius: '0.25rem',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    marginRight: '0.5rem'
                  }}>DEMO</span>
                  Simulated responses (API not connected)
                </div>
                <div>
                  <span style={{ 
                    backgroundColor: '#f3f4f6', 
                    color: '#6b7280', 
                    padding: '0.125rem 0.375rem', 
                    borderRadius: '0.25rem',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    marginRight: '0.5rem'
                  }}>MOCK</span>
                  Placeholder responses only
                </div>
              </div>
            </div>
          </div>
        )}
        
        {messages.map(message => {
          const messageAgent = agents.find(a => a.id === message.model);
          return (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '0.5rem'
              }}
            >
              <div style={{
                maxWidth: '70%',
                padding: '0.75rem 1rem',
                borderRadius: message.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                backgroundColor: message.sender === 'user' 
                  ? '#007bff' 
                  : message.isError 
                    ? '#ff4444' 
                    : 'white',
                color: message.sender === 'user' || message.isError ? 'white' : '#333',
                border: message.sender === 'ai' && !message.isError ? '1px solid #e5e5e5' : 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                position: 'relative'
              }}>
                {message.sender === 'ai' && !message.isError && messageAgent && (
                  <div style={{
                    fontSize: '0.7rem',
                    color: messageAgent.color,
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>{messageAgent.icon}</span>
                    <span>{messageAgent.name}</span>
                    <span style={{
                      ...getStatusBadge(messageAgent.status),
                      padding: '0.125rem 0.25rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.6rem',
                      fontWeight: '600',
                      backgroundColor: getStatusBadge(messageAgent.status).bgColor,
                      color: getStatusBadge(messageAgent.status).color
                    }}>
                      {getStatusBadge(messageAgent.status).text}
                    </span>
                    <span style={{
                      fontSize: '0.6rem',
                      color: '#999',
                      backgroundColor: '#f3f4f6',
                      padding: '0.125rem 0.25rem',
                      borderRadius: '0.25rem'
                    }}>
                      {message.model}
                    </span>
                    {message.timestamp && (
                      <span style={{ color: '#999', fontSize: '0.6rem' }}>
                        {message.timestamp}
                      </span>
                    )}
                  </div>
                )}
                <div style={{ lineHeight: '1.4' }}>{message.text}</div>
              </div>
            </div>
          );
        })}
        
        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: '0.5rem'
          }}>
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '18px 18px 18px 4px',
              backgroundColor: 'white',
              border: '1px solid #e5e5e5',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                fontSize: '0.7rem',
                color: currentAgent.color,
                marginBottom: '0.5rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>{currentAgent.icon}</span>
                <span>{currentAgent.name} is thinking...</span>
                <span style={{
                  ...getStatusBadge(currentAgent.status),
                  padding: '0.125rem 0.25rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.6rem',
                  fontWeight: '600',
                  backgroundColor: getStatusBadge(currentAgent.status).bgColor,
                  color: getStatusBadge(currentAgent.status).color
                }}>
                  {getStatusBadge(currentAgent.status).text}
                </span>
                <span style={{
                  fontSize: '0.6rem',
                  color: '#999',
                  backgroundColor: '#f3f4f6',
                  padding: '0.125rem 0.25rem',
                  borderRadius: '0.25rem'
                }}>
                  {selectedAgent}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ccc',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}></div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ccc',
                  animation: 'pulse 1.5s ease-in-out infinite 0.2s'
                }}></div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ccc',
                  animation: 'pulse 1.5s ease-in-out infinite 0.4s'
                }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '1rem 2rem 2rem',
        backgroundColor: 'white',
        borderTop: '1px solid #e5e5e5'
      }}>
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-end'
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={`Message ${currentAgent.name} (${selectedAgent}) - ${getStatusBadge(currentAgent.status).text}...`}
              style={{
                width: '100%',
                minHeight: '44px',
                maxHeight: '120px',
                padding: '0.75rem 1rem',
                border: '1px solid #e5e5e5',
                borderRadius: '22px',
                fontSize: '1rem',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit'
              }}
              disabled={loading}
              rows={1}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: loading || !inputMessage.trim() ? '#ccc' : currentAgent.color,
              color: 'white',
              cursor: loading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? '⏳' : '➤'}
          </button>
        </form>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% {
            opacity: 0.3;
          }
          40% {
            opacity: 1;
          }
        }
        
        textarea {
          font-family: inherit;
        }
        
        textarea:focus {
          border-color: ${currentAgent.color};
          box-shadow: 0 0 0 2px ${currentAgent.color}20;
        }
      `}</style>
    </div>
  );
}

export default App; 