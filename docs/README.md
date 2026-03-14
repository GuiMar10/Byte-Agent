# Byte - AI Chat Desktop Application

**Byte** is a privacy-focused desktop application for chatting with AI models. Built with Electron, React, and Vite, it provides a unified interface to interact with multiple AI providers including OpenAI, Anthropic, Google Gemini, Ollama, and OpenRouter.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` / `Cmd+B` | Toggle sidebar visibility |
| `Ctrl+,` / `Cmd+,` | Open settings panel |
| `Enter` | Send message |
| `Shift+Enter` | Insert new line in input |
| `Escape` | Cancel editing / close dialogs |

---

## Best Use Cases

### 1. Multi-Provider AI Chat
Access GPT, Claude, Gemini, and 100+ models through OpenRouter from a single application. Compare responses across providers without managing multiple browser tabs.

### 2. Local AI with Ollama
Run open-source models locally (Llama 3, Mistral, Codellama) for privacy-sensitive work. No data leaves your machine.

### 3. Developer Workflow
Built for technical work with:
- Syntax-highlighted code blocks
- LaTeX/Math rendering
- GitHub Flavored Markdown support

### 4. Conversation Management
- Pin important chats for quick access
- Search through conversation history
- Export conversations as JSON for backup

### 5. Privacy-First
All data stored locally. API keys encrypted using OS-level secure storage.

---

## Supported Providers

- **OpenAI** - GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Haiku, Claude 3 Opus
- **Google Gemini** - Gemini Pro, Gemini Ultra
- **Ollama** - Llama 3, Mistral, Codellama, and more
- **OpenRouter** - 100+ models
- **Custom** - Add your own OpenAI-compatible endpoints

---

## Configuration

Access settings via `Ctrl+,` to configure:
- API keys (securely stored)
- Model parameters (temperature, max tokens, top-p)
- System prompts
- Theme (Dark/Light/System)
