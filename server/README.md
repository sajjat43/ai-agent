# AI Agent Server - Modular Architecture

This server has been refactored into a clean, modular architecture for better maintainability and scalability, with support for multiple AI providers including local LLMs via Ollama.

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
│   │   ├── csvRoutes.js  # CSV processing routes
│   │   └── systemRoutes.js
│   ├── controllers/      # Route handlers
│   │   ├── chatController.js
│   │   ├── fileController.js
│   │   ├── csvController.js # CSV processing controller
│   │   └── systemController.js
│   ├── services/         # Business logic
│   │   ├── aiService.js      # AI provider handlers
│   │   └── llm-adapter.js    # Ollama integration
│   └── utils/            # Utility functions
│       ├── fileReader.js # File reading utilities
│       └── logger.js     # Logging and usage tracking
├── scripts/
│   └── dev.sh           # Development startup script
├── index.js             # Main server file with Express setup
├── package.json
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose setup
└── .env                 # Environment variables
```

## 🏗️ Architecture Overview

### Main Server (`index.js`)
- **Express Setup**: Main Express application with middleware
- **Database Connection**: MongoDB connection initialization
- **Route Registration**: All API routes registration including CSV processing
- **Server Startup**: Port binding and graceful shutdown handling

### Configuration (`src/config/`)
- **database.js**: MongoDB connection setup with error handling
- **ai-clients.js**: Initialization of AI provider clients (Google, OpenAI, Anthropic, Ollama)
- **multer.js**: File upload configuration with validation

### Models (`src/models/`)
- **ChatHistory.js**: Schema for storing chat conversations
- **FileUpload.js**: Schema for storing uploaded files and their analyses

### Routes (`src/routes/`)
- **chatRoutes.js**: Chat-related endpoints
- **fileRoutes.js**: File upload and analysis endpoints
- **csvRoutes.js**: CSV processing endpoints
- **systemRoutes.js**: System health and monitoring endpoints

### Controllers (`src/controllers/`)
- **chatController.js**: Handles chat functionality, conversation memory, and context building
- **fileController.js**: Handles file uploads, analysis, and management
- **csvController.js**: Handles CSV processing with AI analysis
- **systemController.js**: Handles health checks, model information, and statistics

### Services (`src/services/`)
- **aiService.js**: Contains provider handlers for different AI models with error handling and logging
- **llm-adapter.js**: Ollama integration for local LLM processing and CSV batch operations

### Utils (`src/utils/`)
- **fileReader.js**: File content reading utilities with support for various file types
- **logger.js**: Usage tracking and logging utilities

## 🦙 LLM Adapter Module

The `llm-adapter` module provides a JavaScript interface to interact with Ollama CLI for local LLM processing and CSV batch operations.

### Features

- 🦙 **Ollama Integration**: Seamless integration with Ollama CLI
- 📊 **CSV Processing**: Parse and process CSV files with AI
- 🔄 **Batch Generation**: Process multiple prompts efficiently
- ⚙️ **Configurable Parameters**: Temperature, top_p, top_k, repeat_penalty
- 📈 **Progress Tracking**: Real-time progress monitoring
- 🛡️ **Error Handling**: Robust error handling and recovery

### Usage

#### Basic Text Generation

```javascript
import llmAdapter from './src/services/llm-adapter.js';

// Initialize the adapter
await llmAdapter.initializeModel({
  modelPath: 'llama2',
  batchSize: 10,
  parameters: {
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1
  }
});

// Generate text
const response = await llmAdapter.generateText('Hello, how are you?');
console.log(response);
```

#### Batch Processing

```javascript
// Process multiple prompts
const prompts = [
  'What is the capital of France?',
  'Explain quantum computing',
  'Write a haiku about programming'
];

const responses = await llmAdapter.batchGenerate(prompts, {
  temperature: 0.8,
  maxTokens: 500
});

console.log(responses);
```

#### CSV Processing

```javascript
// CSV content
const csvContent = `name,age,city
John,25,New York
Jane,30,Los Angeles
Bob,35,Chicago`;

// Prompt template with placeholders
const promptTemplate = `Analyze this person's data:
Name: {name}
Age: {age}
City: {city}

Provide insights about this person.`;

// Process CSV with AI
const result = await llmAdapter.processCSVWithBatchGeneration(
  csvContent,
  (row, index, headers) => {
    // Custom prompt creation function
    return promptTemplate
      .replace(/{name}/g, row.name)
      .replace(/{age}/g, row.age)
      .replace(/{city}/g, row.city);
  },
  {
    temperature: 0.7,
    batchSize: 5
  }
);

console.log('Results:', result.results);
console.log('Summary:', result.summary);
```

### Supported Models

The adapter supports all models available in Ollama:

- **Llama 2**: `llama2`, `llama2:7b`, `llama2:13b`, `llama2:70b`
- **Code Llama**: `codellama`, `codellama:7b`, `codellama:13b`
- **Mistral**: `mistral`, `mixtral`
- **Neural Chat**: `neural-chat`
- **Vicuna**: `vicuna`
- **Custom Models**: Any model available in your Ollama installation

### CSV Processing Features

#### Placeholder Support

The CSV processor supports various placeholders in prompt templates:

- `{row}` - Complete row as JSON
- `{index}` - Row index (0-based)
- `{headers}` - Array of column headers
- `{column_name}` - Value of specific column

#### Example Templates

```javascript
// Simple analysis
const template1 = "Analyze this data: {row}";

// Structured analysis
const template2 = `
Row {index}:
- Name: {name}
- Age: {age}
- City: {city}

Provide insights about this person.
`;

// Conditional processing
const template3 = `
Data: {row}
Headers: {headers}

If age > 25, provide career advice.
If age <= 25, provide education advice.
`;
```

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

### CSV Processing Endpoints
- `POST /api/csv/process` - Process single CSV file with AI
- `POST /api/csv/batch` - Batch process multiple CSV files

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
- Support for multiple file types (text, PDF, documents, CSV)
- File content extraction and storage
- AI-powered file analysis with context awareness

### CSV Processing
- Batch processing of CSV files with AI
- Template-based prompt generation
- Progress tracking and error recovery
- Support for large datasets with chunking

### Conversation Memory
- Session-based conversation history
- Context building from previous messages
- File context integration

### AI Provider Support
- Google AI (Gemini)
- OpenAI (GPT models)
- Anthropic (Claude)
- Ollama (Local LLMs)
- Extensible for additional providers

## 🛠️ Development

### Running the Server
```bash
npm start
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t ai-chat-server .
docker run -p 5000:5000 ai-chat-server
```

### Environment Variables
Create a `.env` file with:
```bash
# AI API Keys (optional for cloud providers)
GEMINI_API_KEY=your_google_ai_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Ollama Configuration
OLLAMA_MODEL_PATH=llama2
OLLAMA_BATCH_SIZE=10
OLLAMA_TEMPERATURE=0.7
OLLAMA_TOP_P=0.9
OLLAMA_TOP_K=40
OLLAMA_REPEAT_PENALTY=1.1

# Server Configuration
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-chat
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
- CSV processing statistics

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
- Batch processing for large datasets

## 🦙 Ollama Setup

### Installation
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama2
```

### Troubleshooting
```bash
# Check Ollama status
ollama list

# Pull required model
ollama pull llama2

# Fix permissions
sudo chown -R $USER:$USER ~/.ollama
```

## 📈 CSV Processing Examples

### Basic CSV Analysis
```bash
curl -X POST http://localhost:5000/api/csv/process \
  -H "Content-Type: application/json" \
  -d '{
    "csvContent": "name,age,city\nJohn,25,New York\nJane,30,Los Angeles",
    "promptTemplate": "Analyze this person: {name} is {age} years old from {city}",
    "modelName": "llama2"
  }'
```

### Batch Processing
```bash
curl -X POST http://localhost:5000/api/csv/batch \
  -H "Content-Type: application/json" \
  -d '{
    "csvFiles": [
      {
        "name": "users.csv",
        "content": "name,age\nJohn,25\nJane,30"
      }
    ],
    "promptTemplate": "Analyze: {row}",
    "modelName": "llama2"
  }'
``` 