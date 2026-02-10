# Local AI WebUI

A fast, private, local-first WebUI for running local LLMs via Ollama and OpenAI-compatible APIs. Built for low-VRAM systems (RTX 3050 Ti / 4GB VRAM).

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.ai) installed and running (for local models)

### Backend Setup

```bash
# From the project root
pip install -r requirements.txt

# Copy and edit environment config
cp .env.example .env

# Start the backend server
python -m uvicorn backend.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server (proxies /api to backend)
npm run dev
```

Open **http://localhost:3000** in your browser.

### Using Ollama (Local)

1. Install Ollama from https://ollama.ai
2. Pull a model: `ollama pull llama3.2:3b` (or any model that fits your VRAM)
3. Ollama runs on `localhost:11434` by default — the app connects automatically

### Using a Remote Provider

1. Click **Provider** in the header
2. Switch to **OpenAI-Compatible**
3. Select a preset (OpenAI, DeepSeek, Groq, etc.) or enter a custom URL
4. Enter your API key
5. Click **Test Connection**
6. Select a model from the dropdown

## Features

- **Streaming chat** with markdown rendering (code blocks, tables, lists)
- **Per-session system prompts** with built-in presets (Default, Concise, Technical)
- **Sliding window memory** with token-budget logic — adapts to conversation length
- **Two providers**: Ollama (local) and OpenAI-compatible (any remote service)
- **Model metadata display**: parameter count, quantization, context length
- **Performance controls**: context cap, max response tokens, low-VRAM safe mode
- **Session isolation**: each chat has its own prompt, history, and settings
- **Privacy indicator**: warns when messages leave your machine (remote provider)

## Architecture

```
backend/           FastAPI server (Python)
├── main.py        Entry point, CORS, router mounting
├── config.py      Settings, presets, defaults
├── routers/       API endpoints (chat, sessions, models, providers)
├── providers/     LLM provider abstraction (Ollama, OpenAI-compatible)
├── sessions/      Session manager + sliding window memory
└── utils/         Token estimation

frontend/          React + Vite (JavaScript)
├── src/
│   ├── App.jsx           Main shell
│   ├── components/       UI components
│   ├── hooks/            State management (useChat, useSession, useProvider)
│   ├── services/api.js   Backend API client
│   └── utils/            Markdown config
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/chat/send` | Send message (SSE streaming) |
| GET | `/api/sessions` | List sessions |
| POST | `/api/sessions` | Create session |
| GET | `/api/sessions/:id` | Get session |
| PUT | `/api/sessions/:id` | Update session |
| DELETE | `/api/sessions/:id` | Delete session |
| POST | `/api/sessions/:id/clear` | Clear session memory |
| GET | `/api/models` | List models |
| GET | `/api/models/:id/info` | Model metadata |
| GET | `/api/providers/presets` | Provider presets |
| GET | `/api/providers/config` | Current config |
| POST | `/api/providers/test` | Test connection |
