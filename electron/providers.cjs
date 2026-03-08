function createProviderManager() {
  const adapters = {
    openrouter: openAICompatibleAdapter,
    openai: openAICompatibleAdapter,
    anthropic: anthropicAdapter,
    gemini: geminiAdapter,
    ollama: ollamaAdapter,
  };

  return {
    async fetchModels(provider, apiKey) {
      const adapter = adapters[provider.type];
      if (!adapter) throw new Error(`Unknown provider type: ${provider.type}`);
      return adapter.fetchModels(provider, apiKey);
    },

    async chatStream(provider, apiKey, model, messages, settings, signal, onChunk) {
      const adapter = adapters[provider.type];
      if (!adapter) throw new Error(`Unknown provider type: ${provider.type}`);
      return adapter.chatStream(provider, apiKey, model, messages, settings, signal, onChunk);
    },
  };
}

// ─── OpenAI-compatible (OpenRouter, OpenAI) ───

const openAICompatibleAdapter = {
  async fetchModels(provider, apiKey) {
    const headers = { 'Authorization': `Bearer ${apiKey}` };
    if (provider.type === 'openrouter') {
      headers['HTTP-Referer'] = 'https://byte.app';
      headers['X-Title'] = 'Byte';
    }
    const res = await fetch(`${provider.baseUrl}/models`, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`);
    const json = await res.json();
    return (json.data || []).map((m) => ({
      id: m.id,
      name: m.name || m.id,
      contextLength: m.context_length || m.context_window || null,
      pricing: m.pricing || null,
    }));
  },

  async chatStream(provider, apiKey, model, messages, settings, signal, onChunk) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };
    if (provider.type === 'openrouter') {
      headers['HTTP-Referer'] = 'https://byte.app';
      headers['X-Title'] = 'Byte';
    }

    const body = {
      model,
      messages: messages.map((m) => {
        if (m.images && m.images.length > 0) {
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.content },
              ...m.images.map((img) => ({
                type: 'image_url',
                image_url: { url: `data:${img.mime};base64,${img.data}` },
              })),
            ],
          };
        }
        return { role: m.role, content: m.content };
      }),
      temperature: settings.temperature ?? 0.7,
      max_tokens: settings.maxTokens ?? 4096,
      top_p: settings.topP ?? 1.0,
      stream: true,
    };

    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new Error(`API error ${res.status}: ${errText}`);
    }

    await streamSSE(res, onChunk);
  },
};

// ─── Anthropic ───

const anthropicAdapter = {
  async fetchModels(provider, apiKey) {
    // Anthropic doesn't have a models endpoint; return a curated list
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', contextLength: 200000, pricing: null },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextLength: 200000, pricing: null },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextLength: 200000, pricing: null },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextLength: 200000, pricing: null },
    ];
  },

  async chatStream(provider, apiKey, model, messages, settings, signal, onChunk) {
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system').map((m) => {
      if (m.images && m.images.length > 0) {
        return {
          role: m.role,
          content: [
            ...m.images.map((img) => ({
              type: 'image',
              source: { type: 'base64', media_type: img.mime, data: img.data },
            })),
            { type: 'text', text: m.content },
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    const body = {
      model,
      messages: chatMessages,
      max_tokens: settings.maxTokens ?? 4096,
      temperature: settings.temperature ?? 0.7,
      top_p: settings.topP ?? 1.0,
      stream: true,
    };
    if (systemMessage) body.system = systemMessage.content;

    const res = await fetch(`${provider.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Anthropic API error ${res.status}: ${errText}`);
    }

    // Anthropic SSE streaming
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          try {
            const json = JSON.parse(data);
            if (json.type === 'content_block_delta' && json.delta?.text) {
              onChunk(json.delta.text);
            }
          } catch { /* skip */ }
        }
      }
    }
  },
};

// ─── Google Gemini ───

const geminiAdapter = {
  async fetchModels(provider, apiKey) {
    const res = await fetch(`${provider.baseUrl}/models?key=${apiKey}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Failed to fetch Gemini models: ${res.status}`);
    const json = await res.json();
    return (json.models || [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => ({
        id: m.name.replace('models/', ''),
        name: m.displayName || m.name,
        contextLength: m.inputTokenLimit || null,
        pricing: null,
      }));
  },

  async chatStream(provider, apiKey, model, messages, settings, signal, onChunk) {
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const contents = chatMessages.map((m) => {
      const parts = [];
      if (m.images && m.images.length > 0) {
        m.images.forEach((img) => {
          parts.push({ inlineData: { mimeType: img.mime, data: img.data } });
        });
      }
      parts.push({ text: m.content });
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });

    const body = {
      contents,
      generationConfig: {
        temperature: settings.temperature ?? 0.7,
        maxOutputTokens: settings.maxTokens ?? 4096,
        topP: settings.topP ?? 1.0,
      },
    };
    if (systemMessage) {
      body.systemInstruction = { parts: [{ text: systemMessage.content }] };
    }

    const res = await fetch(
      `${provider.baseUrl}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          try {
            const json = JSON.parse(data);
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) onChunk(text);
          } catch { /* skip */ }
        }
      }
    }
  },
};

// ─── Ollama (Local) ───

const ollamaAdapter = {
  async fetchModels(provider) {
    const res = await fetch(`${provider.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('Failed to connect to Ollama. Is it running?');
    const json = await res.json();
    return (json.models || []).map((m) => ({
      id: m.name,
      name: m.name,
      contextLength: null,
      pricing: null,
    }));
  },

  async chatStream(provider, _apiKey, model, messages, settings, signal, onChunk) {
    const body = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      options: {
        temperature: settings.temperature ?? 0.7,
        num_predict: settings.maxTokens ?? 4096,
        top_p: settings.topP ?? 1.0,
      },
    };

    const res = await fetch(`${provider.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Ollama error ${res.status}: ${errText}`);
    }

    // Ollama streams JSON lines (NDJSON)
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            onChunk(json.message.content);
          }
        } catch { /* skip */ }
      }
    }
  },
};

// ─── SSE Helper ───

async function streamSSE(res, onChunk) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch { /* skip */ }
      }
    }
  }
}

module.exports = { createProviderManager };
