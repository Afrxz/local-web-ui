# Local AI WebUI — Project Brief (v1)

## Purpose

A fast, private, local-first WebUI for running local LLMs that prioritizes stability, clarity, and control — even on low-VRAM systems.

---

## Hardware Constraints

- **GPU:** NVIDIA RTX 3050 Ti (4GB VRAM)
- **RAM:** 16GB system memory
- **Implication:** All architecture decisions (context limits, token budgets, memory strategy) must account for these constraints. The UI is lightweight; Ollama handles inference.

---

## Tech Stack

| Layer    | Technology       | Notes                                   |
| -------- | ---------------- | --------------------------------------- |
| Backend  | FastAPI (Python) | Proxies to Ollama + OpenAI-compatible APIs |
| Frontend | React            | Clean single-page chat interface        |
| Local LLM| Ollama          | Runs on `localhost:11434`               |
| Remote LLM| OpenAI-compatible API | User provides base URL + API key  |

---

## Providers

### 1. Ollama (Local)

- **API base:** `http://localhost:11434`
- **Endpoints used:**
  - `POST /api/chat` — chat completions with streaming
  - `GET /api/tags` — list available models
  - `POST /api/show` — model metadata (parameter count, quantization, etc.)
- **Auth:** None required
- **Streaming:** Native SSE support

### 2. OpenAI-Compatible (Remote)

This single provider covers many services by letting the user configure the base URL:

| Provider     | Base URL                                    |
| ------------ | ------------------------------------------- |
| OpenAI       | `https://api.openai.com/v1`                |
| DeepSeek     | `https://api.deepseek.com`                 |
| Groq         | `https://api.groq.com/openai/v1`          |
| Together AI  | `https://api.together.xyz/v1`              |
| Fireworks    | `https://api.fireworks.ai/inference/v1`    |
| OpenRouter   | `https://openrouter.ai/api/v1`            |
| LM Studio    | `http://localhost:1234/v1`                 |
| vLLM         | `http://localhost:8000/v1`                 |

- **Endpoints used:**
  - `POST /chat/completions` — chat completions with streaming
  - `GET /models` — list available models
- **Auth:** Bearer token (API key)
- **Streaming:** SSE with `stream: true`

### Provider Abstraction

Both providers implement a common interface:

```
Provider:
  - send_message(messages, system_prompt, config) → stream of tokens
  - list_models() → model list
  - get_model_info(model_id) → metadata
  - validate_connection() → bool
```

The rest of the app (chat, sessions, memory) does not care which provider is active. The frontend always receives tokens in the same normalized format.

---

## Features

### 1. Chat Interface

- Clean, ChatGPT-style layout
- Streaming responses (tokens render as they arrive)
- Markdown rendering: code blocks with syntax highlighting, lists, tables, inline formatting
- Per-session conversations
- Visual indicator showing active provider + model (e.g., "Local · Llama 3 8B" or "Cloud · GPT-4o")

### 2. System Prompt Editor (Per Session)

- Editable system prompt for the active session
- Built-in prompt presets:
  - **Default:** General-purpose assistant
  - **Concise:** Short, direct answers
  - **Technical:** Detailed technical responses with code examples
  - (More can be added later)
- Reset-to-default option
- Applied consistently: system prompt is always the first message sent to the model
- **Scope:** Applies only to the current session, does not affect other sessions

### 3. Session Memory — Sliding Window (Token-Budget Based)

**Strategy:** Keep the most recent messages that fit within a token budget. This is adaptive — short exchanges preserve more turns, long code-heavy ones keep fewer.

**Token budget calculation:**

```
max_context = model_context_length   # e.g., 4096 for local, higher for remote
system_prompt_tokens = measured       # actual token count of system prompt
max_response_tokens = configured      # user-configurable, default 800
history_budget = max_context - system_prompt_tokens - max_response_tokens

# Fill from most recent messages backward until history_budget is spent
```

**Defaults for local (RTX 3050 Ti):**

- Total context: 2048–4096 tokens
- System prompt reserve: ~200–300 tokens
- Response headroom: ~500–800 tokens
- History budget: ~1000–3000 tokens
- Secondary cap: N = 10–20 messages (whichever limit is hit first)

**Defaults for remote APIs:**

- Higher context limits (8K–128K depending on model)
- Token budget logic stays the same, just with larger numbers

**Token counting:**

- For Ollama: use a simple approximation (words × 1.3) or integrate a tokenizer later
- For OpenAI-compatible: same approximation is fine for v1
- Don't over-engineer this — rough estimates work because APIs return clear errors on context overflow

**UI exposure:** A simple slider or dropdown — "Context usage: Conservative / Balanced / Maximum" — that adjusts the ratios without requiring users to understand token math.

### 4. Model Manager

- Select active model from the current provider
- Display model metadata:
  - Model name
  - Parameter count (from Ollama's `/api/show` or OpenAI's `/models`)
  - Quantization level (Ollama only)
  - Context length
- Switch models between sessions
- For remote providers: populate model list from the API

### 5. Performance-Aware Controls

Designed for low-VRAM environments (primarily relevant for Ollama):

- **Max token limit:** Cap response length
- **Context length cap:** Override model's default context window
- **Low-VRAM safe mode:** Sets conservative defaults (2048 context, lower max tokens). Warns when a selected model may be too large based on Ollama model info
- These controls can be relaxed or hidden when using remote APIs (since VRAM isn't a concern)

### 6. Session Management

- New chat / reset session (clears history and memory)
- Clear session memory (keeps chat visible but resets what's sent to model)
- Independent chat threads (sessions are isolated)
- No hidden persistence — when a session is cleared, it's gone

### 7. Provider Settings Panel

- **Choose provider:** Ollama or OpenAI-compatible
- **For OpenAI-compatible:**
  - Dropdown of popular presets (OpenAI, DeepSeek, Groq, Together, etc.) that pre-fill the base URL
  - Manual base URL entry for custom endpoints
  - API key input (stored locally only, never logged)
- **Test connection** button to validate before chatting
- **Model selection** from the chosen provider

### 8. Privacy & Security

- No cloud services (unless user explicitly configures a remote provider)
- No telemetry
- All local inference runs through Ollama
- API keys stored in local config / environment variables only, never in browser storage or logs
- When remote provider is active, a clear visual indicator shows the user their messages are leaving the machine

---

## Architecture Principles

- **Explicit state over implicit behavior** — no hidden context or magic
- **Session-scoped control** — changes in one session don't leak to others
- **Minimal context sent to model** — only what fits the token budget
- **UI features that scale down** — works well with small local models
- **Provider-agnostic core** — chat logic doesn't know or care about the inference backend

---

## Project Structure (Suggested)

```
local-ai-webui/
├── backend/
│   ├── main.py                    # FastAPI entry point
│   ├── config.py                  # Settings, defaults, env loading
│   ├── routers/
│   │   ├── chat.py                # Chat endpoints (send message, stream response)
│   │   ├── sessions.py            # Session CRUD
│   │   ├── models.py              # Model listing and metadata
│   │   └── providers.py           # Provider config and connection testing
│   ├── providers/
│   │   ├── base.py                # Abstract provider interface
│   │   ├── ollama.py              # Ollama implementation
│   │   └── openai_compat.py       # OpenAI-compatible implementation
│   ├── sessions/
│   │   ├── manager.py             # Session state management
│   │   └── memory.py              # Sliding window token-budget logic
│   └── utils/
│       └── tokens.py              # Token counting/estimation
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Main app shell
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx     # Message display with markdown
│   │   │   ├── MessageInput.jsx   # Input box with send
│   │   │   ├── Sidebar.jsx        # Session list, new chat button
│   │   │   ├── SystemPrompt.jsx   # System prompt editor + presets
│   │   │   ├── ModelSelector.jsx  # Model picker + metadata display
│   │   │   ├── ProviderSettings.jsx # Provider config panel
│   │   │   └── PerformanceControls.jsx # VRAM-aware settings
│   │   ├── hooks/
│   │   │   ├── useChat.js         # Chat state and streaming logic
│   │   │   ├── useSession.js      # Session management
│   │   │   └── useProvider.js     # Provider state
│   │   ├── services/
│   │   │   └── api.js             # Backend API client
│   │   └── utils/
│   │       └── markdown.js        # Markdown rendering config
│   └── package.json
├── .env.example                   # API keys, config template
├── requirements.txt               # Python dependencies
├── PROJECT_BRIEF.md               # This file
└── README.md                      # Setup and run instructions
```

---

## Key Dependencies

### Backend (Python)

- `fastapi` — web framework
- `uvicorn` — ASGI server
- `httpx` — async HTTP client (for Ollama and OpenAI API calls)
- `pydantic` — data validation and settings
- `python-dotenv` — environment variable loading
- `sse-starlette` — server-sent events for streaming

### Frontend (React)

- `react` / `react-dom`
- `react-markdown` + `remark-gfm` — markdown rendering
- `react-syntax-highlighter` — code block highlighting
- `vite` — build tool / dev server

---

## Not in v1 (Future)

- **Rolling summary memory** — compress older messages into summaries (upgrade path from sliding window)
- **Deep research mode** — multi-step reasoning, retrieval, structured outputs
- **Long-term memory** — user-approved persistent knowledge storage
- **Anthropic provider** — different message format, separate implementation
- **Custom provider** — fully configurable endpoint + headers for advanced users

---

## One-Line Summary

A local LLM WebUI with two provider backends (Ollama + OpenAI-compatible), per-session system prompts, and token-budget sliding window memory, built to be reliable on low-VRAM hardware and extensible tomorrow.
