# AI Agent Server - Modular Architecture

This server has been refactored into a clean, modular architecture for better maintainability and scalability.

## 📁 Project Structure

```
server/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js   # MongoDB connection setup
│   │   ├── ai-clients.js # AI provider clients initialization
│   │   └── multer.js     # File upload configuration
│   ├── models/           # Database models
│   │   ├── ChatHistory.js
│   │   └── FileUpload.js
│   ├── routes/           # Express routes
│   │   ├── chatRoutes.js
│   │   ├── fileRoutes.js
│   │   └── systemRoutes.js
│   ├── controllers/      # Route handlers
│   │   ├── chatController.js
│   │   ├── fileController.js
│   │   └── systemController.js
│   ├── services/         # Business logic
│   │   └── aiService.js  # AI provider handlers
│   └── utils/            # Utility functions
│       ├── fileReader.js # File reading utilities
│       └── logger.js     # Logging and usage tracking
├── scripts/
│   └── dev.sh           # Development startup script
├── index.js             # Main server file with Express setup
├── package.json
└── .env                 # Environment variables
```

## 🏗️ Architecture Overview

### Main Server (`index.js`)
- **Express Setup**: Main Express application with middleware
- **Database Connection**: MongoDB connection initialization
- **Route Registration**: All API routes registration
- **Server Startup**: Port binding and graceful shutdown handling

### Configuration (`src/config/`)
- **database.js**: MongoDB connection setup with error handling
- **ai-clients.js**: Initialization of AI provider clients (Google, OpenAI, Anthropic)
- **multer.js**: File upload configuration with validation

### Models (`src/models/`)
- **ChatHistory.js**: Schema for storing chat conversations
- **FileUpload.js**: Schema for storing uploaded files and their analyses

### Routes (`src/routes/`)
- **chatRoutes.js**: Chat-related endpoints
- **fileRoutes.js**: File upload and analysis endpoints
- **systemRoutes.js**: System health and monitoring endpoints

### Controllers (`src/controllers/`)
- **chatController.js**: Handles chat functionality, conversation memory, and context building
- **fileController.js**: Handles file uploads, analysis, and management
- **systemController.js**: Handles health checks, model information, and statistics

### Services (`src/services/`)
- **aiService.js**: Contains provider handlers for different AI models with error handling and logging

### Utils (`src/utils/`)
- **fileReader.js**: File content reading utilities with support for various file types
- **logger.js**: Usage tracking and logging utilities

## 🚀 API Endpoints

### Chat Endpoints
- `POST /api/chat` - Send a message to an AI model
- `GET /api/history/:sessionId` - Get chat history for a session
- `GET /api/sessions` - Get all chat sessions
- `DELETE /api/history/:sessionId` - Delete chat history for a session

### File Endpoints
- `POST /api/upload` - Upload a file
- `GET /api/files/:sessionId` - Get files for a session
- `POST /api/analyze-file` - Analyze a file with AI
- `GET /api/file-analysis/:fileId` - Get file analysis history
- `DELETE /api/files/:fileId` - Delete a file

### System Endpoints
- `GET /api/health` - Server health check
- `GET /api/models` - Get available AI models
- `GET /api/stats` - Get usage statistics

## 🔧 Key Features

### Modular Design
- **Separation of Concerns**: Each module has a specific responsibility
- **Easy Testing**: Controllers and services can be tested independently
- **Scalability**: Easy to add new features or modify existing ones
- **Maintainability**: Clear structure makes code easier to understand and maintain

### Error Handling
- Comprehensive error handling throughout the application
- Proper HTTP status codes and error messages
- Logging of errors for debugging
- Graceful shutdown handling

### File Processing
- Support for multiple file types (text, PDF, documents)
- File content extraction and storage
- AI-powered file analysis with context awareness

### Conversation Memory
- Session-based conversation history
- Context building from previous messages
- File context integration

### AI Provider Support
- Google AI (Gemini)
- OpenAI (GPT models)
- Anthropic (Claude)
- Extensible for additional providers

## 🛠️ Development

### Running the Server
```bash
npm start
```

### Environment Variables
Create a `.env` file with:
```
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_google_ai_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
PORT=5000
```

### Adding New Features
1. **New AI Provider**: Add to `src/config/ai-clients.js` and `src/services/aiService.js`
2. **New Endpoint**: Create controller in `src/controllers/` and route in `src/routes/`
3. **New Model**: Create schema in `src/models/`
4. **New Utility**: Add to `src/utils/`

## 📊 Monitoring

The server includes comprehensive monitoring:
- Request/response logging
- Model usage tracking
- Performance metrics
- Error tracking
- Health check endpoints

## 🔒 Security

- CORS enabled for cross-origin requests
- File type validation
- File size limits
- Input validation
- Error message sanitization

## 🚀 Performance

- Efficient database queries with proper indexing
- File content caching in database
- Optimized context building
- Response time tracking
- Memory usage monitoring 