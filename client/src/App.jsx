import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('gemini-1.5-flash');
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showFilePanel, setShowFilePanel] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileForAnalysis, setSelectedFileForAnalysis] = useState(null);
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [theme, setTheme] = useState('light');
  const messagesEndRef = useRef(null);

  const agents = [
    // Google Models
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'google',
      color: '#4285f4',
      icon: '🤖',
      status: 'ACTIVE',
      description: 'Fast and efficient AI assistant'
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'google',
      color: '#4285f4',
      icon: '🤖',
      status: 'ACTIVE',
      description: 'Advanced reasoning and analysis'
    },
    
    // OpenAI Models
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      color: '#10a37f',
      icon: '🧠',
      status: 'ACTIVE',
      description: 'Latest GPT-4 model'
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      color: '#10a37f',
      icon: '🧠',
      status: 'ACTIVE',
      description: 'Compact GPT-4 model'
    },
    
    // Anthropic Models
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      color: '#d97706',
      icon: '🎭',
      status: 'ACTIVE',
      description: 'Anthropic\'s most capable model'
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      color: '#d97706',
      icon: '🎭',
      status: 'ACTIVE',
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

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Generate or get session ID
  useEffect(() => {
    const storedSessionId = localStorage.getItem('currentSessionId');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      loadChatHistory(storedSessionId);
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('currentSessionId', newSessionId);
    }
  }, []);

  // Handle clicking outside the agent selector
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAgentSelector && !event.target.closest('.agent-selector')) {
        setShowAgentSelector(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && showAgentSelector) {
        setShowAgentSelector(false);
      }
    };

    if (showAgentSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showAgentSelector]);

  // Load chat history for a session
  const loadChatHistory = async (sessionId) => {
    try {
      setLoadingHistory(true);
      const response = await fetch(`http://localhost:5000/api/history/${sessionId}`);
      const data = await response.json();
      
      if (response.ok && data.chats) {
        const formattedMessages = data.chats.map((chat, index) => [
          {
            id: `user_${index}`,
            text: chat.userMessage,
            sender: 'user',
            timestamp: new Date(chat.timestamp).toLocaleTimeString()
          },
          {
            id: `ai_${index}`,
            text: chat.aiResponse,
            sender: 'ai',
            agent: agents.find(agent => agent.id === chat.model) || agents[0],
            actualModel: chat.model,
            provider: chat.provider,
            status: chat.status,
            timestamp: new Date(chat.timestamp).toLocaleTimeString()
          }
        ]).flat();
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load all sessions
  const loadSessions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/sessions');
      const data = await response.json();
      
      if (response.ok && data.sessions) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  // Start new session
  const startNewSession = () => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    localStorage.setItem('currentSessionId', newSessionId);
    setMessages([]);
    setShowHistory(false);
  };

  // Switch to existing session
  const switchToSession = (sessionId) => {
    setSessionId(sessionId);
    localStorage.setItem('currentSessionId', sessionId);
    loadChatHistory(sessionId);
    setShowHistory(false);
  };

  // Delete session
  const deleteSession = async (sessionId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/history/${sessionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setSessions(sessions.filter(session => session._id !== sessionId));
        if (sessionId === sessionId) {
          startNewSession();
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

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
          provider: selectedAgentData.provider,
          sessionId: sessionId
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
          contextUsed: data.contextUsed,
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

  // File upload functions
  const loadUploadedFiles = async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/files/${sessionId}`);
      const data = await response.json();
      
      if (response.ok) {
        setUploadedFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to load uploaded files:', error);
    }
  };

  const handleFileUpload = async (file) => {
    if (!sessionId) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);

    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setUploadedFiles(prev => [data, ...prev]);
        setSelectedFile(null);
        
        // Add a message to chat about the upload
        const uploadMessage = {
          id: `upload_${Date.now()}`,
          text: `📁 Uploaded file: ${data.originalName} (${Math.round(data.size / 1024)}KB)`,
          sender: 'user',
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, uploadMessage]);
      } else {
        alert(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileAnalysis = async () => {
    console.log('🔍 Starting file analysis...');
    console.log('selectedFileForAnalysis:', selectedFileForAnalysis);
    console.log('analysisPrompt:', analysisPrompt);
    console.log('selectedAgent:', selectedAgent);
    console.log('selectedAgentData:', selectedAgentData);
    
    if (!selectedFileForAnalysis || !analysisPrompt.trim()) {
      console.log('❌ Missing required data for analysis');
      alert('Please select a file and enter an analysis prompt');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const requestData = {
        fileId: selectedFileForAnalysis.fileId || selectedFileForAnalysis._id,
        prompt: analysisPrompt,
        model: selectedAgent,
        provider: selectedAgentData.provider
      };
      
      console.log('📤 Sending request data:', requestData);
      
      const response = await fetch('http://localhost:5000/api/analyze-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('📥 Response data:', data);

      if (response.ok) {
        // Add user message
        const userMessage = {
          id: `user_${Date.now()}`,
          text: `📄 Analyze "${selectedFileForAnalysis.originalName}": ${analysisPrompt}`,
          sender: 'user',
          timestamp: new Date().toLocaleTimeString()
        };

        // Add AI response
        const aiMessage = {
          id: `ai_${Date.now()}`,
          text: data.response,
          sender: 'ai',
          agent: selectedAgentData,
          actualModel: data.model,
          provider: data.provider,
          status: data.status,
          contextUsed: data.contextUsed,
          timestamp: new Date().toLocaleTimeString()
        };

        setMessages(prev => [...prev, userMessage, aiMessage]);
        setAnalysisPrompt('');
        setSelectedFileForAnalysis(null);
        
        // Reload files to get updated analysis count
        loadUploadedFiles();
        
        // Reload chat history to ensure persistence
        await loadChatHistory(sessionId);
      } else {
        console.error('❌ Analysis failed:', data);
        alert(`Analysis failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Analysis error:', error);
      alert('Analysis failed. Please check the console for details.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteFile = async (fileId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/files/${fileId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUploadedFiles(prev => prev.filter(file => file._id !== fileId));
      } else {
        const data = await response.json();
        alert(`Delete failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed. Please try again.');
    }
  };

  // Load files when session changes
  useEffect(() => {
    if (sessionId) {
      loadUploadedFiles();
    }
  }, [sessionId]);

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);
  const statusBadge = getStatusBadge(selectedAgentData);

  return (
    <div className="app">
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <div className="header-content">
            <div className="agent-info">
              <div className="agent-icon">{selectedAgentData.icon}</div>
              <div className="agent-details">
                <h1 className="agent-name">{selectedAgentData.name}</h1>
                <p className="agent-description">{selectedAgentData.description}</p>
              </div>
            </div>
            
            <div className="header-controls">
              <button 
                className="theme-toggle"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              
              <button 
                className="history-button"
                onClick={() => setShowHistory(!showHistory)}
              >
                📚 History
              </button>
              
              <button 
                className="history-button"
                onClick={startNewSession}
              >
                ➕ New Chat
              </button>
              
              <div className="agent-selector">
                <button 
                  className="selector-button"
                  onClick={() => setShowAgentSelector(!showAgentSelector)}
                >
                  <span>{selectedAgentData.icon}</span>
                  <span>{selectedAgentData.name}</span>
                  <span>▼</span>
                </button>
                
                {showAgentSelector && (
                  <div className="selector-dropdown">
                    {agents.map(agent => (
                      <button
                        key={agent.id}
                        className={`agent-option ${agent.id === selectedAgent ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedAgent(agent.id);
                          setShowAgentSelector(false);
                        }}
                      >
                        <div className="option-content">
                          <span>{agent.icon}</span>
                          <div className="option-details">
                            <span className="option-name">{agent.name}</span>
                            <span className="option-description">{agent.description}</span>
                          </div>
                          <span 
                            className="option-status"
                            style={{ backgroundColor: agent.status === 'ACTIVE' ? '#10a37f' : '#6b7280' }}
                          >
                            {agent.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div className="history-sidebar">
            <div className="history-header">
              <h3>Chat History</h3>
              <button 
                className="close-history"
                onClick={() => setShowHistory(false)}
              >
                ✕
              </button>
            </div>
            <div className="history-content">
              {loadingHistory ? (
                <div className="loading-history">
                  <div className="loading-spinner"></div>
                  <p>Loading sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="no-sessions">
                  <p>No chat sessions found.</p>
                  <p>Start a conversation to create your first session!</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session._id} className="session-item">
                    <div className="session-info">
                      <div className="session-id">
                        Session {session._id.split('_')[1] ? 
                          new Date(parseInt(session._id.split('_')[1])).toLocaleDateString() : 
                          session._id.substring(0, 12)}
                      </div>
                      <div className="session-meta">
                        {session.messageCount} messages • {session.models.join(', ')}
                      </div>
                      <div className="session-date">
                        {new Date(session.lastMessage).toLocaleString()}
                      </div>
                    </div>
                    <div className="session-actions">
                      <button 
                        className="load-session"
                        onClick={() => switchToSession(session._id)}
                      >
                        Load
                      </button>
                      <button 
                        className="delete-session"
                        onClick={() => deleteSession(session._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* File Panel */}
        {showFilePanel && (
          <div className="file-panel">
            <div className="file-panel-header">
              <h3>File Management</h3>
              <button 
                className="close-file-panel"
                onClick={() => setShowFilePanel(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="file-panel-content">
              {/* File Upload Section */}
              <div className="file-upload-section">
                <h4>Upload File</h4>
                <div className="file-upload-area">
                  <input
                    type="file"
                    id="file-input"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setSelectedFile(file);
                        handleFileUpload(file);
                      }
                    }}
                    accept=".txt,.csv,.json,.pdf,.doc,.docx,.xls,.xlsx,.html,.xml,.md"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="file-input" className="file-upload-label">
                    {isUploading ? (
                      <div className="uploading">
                        <div className="loading-spinner"></div>
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <span className="upload-icon">📤</span>
                        <span>Click to upload file</span>
                        <small>Supports: TXT, CSV, JSON, PDF, DOC, XLS, HTML, XML, MD</small>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Uploaded Files List */}
              <div className="uploaded-files-section">
                <h4>Uploaded Files ({uploadedFiles.length})</h4>
                {uploadedFiles.length === 0 ? (
                  <div className="no-files">
                    <p>No files uploaded yet.</p>
                    <p>Upload a file to start analyzing it with AI!</p>
                  </div>
                ) : (
                  <div className="files-list">
                    {uploadedFiles.map((file) => (
                      <div key={file._id} className="file-item">
                        <div className="file-info">
                          <div className="file-name">{file.originalName}</div>
                          <div className="file-meta">
                            {Math.round(file.size / 1024)}KB • {file.mimetype} • 
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </div>
                          {file.analysisPrompts && file.analysisPrompts.length > 0 && (
                            <div className="analysis-count">
                              {file.analysisPrompts.length} analysis{file.analysisPrompts.length > 1 ? 'es' : ''}
                            </div>
                          )}
                        </div>
                        <div className="file-actions">
                          <button
                            className="analyze-button"
                            onClick={() => setSelectedFileForAnalysis(file)}
                            style={{ backgroundColor: selectedAgentData.color }}
                          >
                            🔍 Analyze
                          </button>
                          <button
                            className="delete-file-button"
                            onClick={() => deleteFile(file._id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* File Analysis Section */}
              {selectedFileForAnalysis && (
                <div className="file-analysis-section">
                  <h4>Analyze: {selectedFileForAnalysis.originalName}</h4>
                  <div className="analysis-form">
                    <textarea
                      value={analysisPrompt}
                      onChange={(e) => setAnalysisPrompt(e.target.value)}
                      placeholder="Enter your analysis prompt... (e.g., 'Summarize this document', 'Extract key insights', 'Find errors in this code')"
                      className="analysis-prompt-input"
                      rows="3"
                    />
                    <div className="analysis-actions">
                      <button
                        className="analyze-submit-button"
                        onClick={handleFileAnalysis}
                        disabled={isAnalyzing || !analysisPrompt.trim()}
                        style={{ backgroundColor: selectedAgentData.color }}
                      >
                        {isAnalyzing ? '🔄 Analyzing...' : '🚀 Analyze with AI'}
                      </button>
                      <button
                        className="cancel-analysis-button"
                        onClick={() => {
                          setSelectedFileForAnalysis(null);
                          setAnalysisPrompt('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-content">
                <h2>How can I help you today?</h2>
                <p>I'm an AI assistant powered by multiple language models. Ask me anything!</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div className="message-wrapper">
                  <div className="message-avatar">
                    {message.sender === 'user' ? '👤' : message.agent?.icon || '🤖'}
                  </div>
                  <div className="message-content">
                    {message.sender === 'ai' && (
                      <div className="message-header">
                        <span className="message-agent-name">
                          {message.agent?.name || 'AI Assistant'}
                        </span>
                        <span 
                          className={`message-status ${message.status || 'success'}`}
                        >
                          {message.status === 'loading' ? 'THINKING' : message.status?.toUpperCase() || 'SUCCESS'}
                        </span>
                      </div>
                    )}
                    <div className="message-text">
                      {message.text}
                    </div>
                    <div className="message-time">{message.timestamp}</div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="message ai">
              <div className="message-wrapper">
                <div className="message-avatar">{selectedAgentData.icon}</div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-agent-name">{selectedAgentData.name}</span>
                    <span className="message-status loading">THINKING</span>
                  </div>
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-container">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Message ${selectedAgentData.name}...`}
              className="message-input"
              disabled={isLoading}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button 
              type="submit" 
              className="send-button"
              disabled={isLoading || !inputMessage.trim()}
            >
              {isLoading ? '⏳' : '↑'}
            </button>
          </div>
          <div className="input-hint">
            Press Enter to send, Shift+Enter for new line • {selectedAgentData.name}
          </div>
        </form>
      </div>
    </div>
  );
}

export default App; 