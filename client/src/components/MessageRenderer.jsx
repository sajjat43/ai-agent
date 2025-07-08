import React from 'react';
import { marked } from 'marked';

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
});

const MessageRenderer = ({ content, isUser = false }) => {
  if (isUser) {
    return <div className="message-text user-message">{content}</div>;
  }

  // Simple markdown-like parsing for AI messages
  const parseContent = (text) => {
    // Convert markdown to HTML
    const htmlContent = marked(text);
    
    // Create a safe HTML renderer
    return (
      <div 
        className="message-text ai-message"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  };

  return parseContent(content);
};

export default MessageRenderer; 