/**
 * Backend API client.
 * All requests go through the Vite proxy (/api -> localhost:8000).
 */

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// --- Sessions ---

export async function listSessions() {
  return request('/sessions');
}

export async function createSession(title, systemPrompt, providerConfig = {}) {
  return request('/sessions', {
    method: 'POST',
    body: JSON.stringify({ title, system_prompt: systemPrompt, ...providerConfig }),
  });
}

export async function getSession(sessionId) {
  return request(`/sessions/${sessionId}`);
}

export async function updateSession(sessionId, data) {
  return request(`/sessions/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSession(sessionId) {
  return request(`/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function clearSessionMemory(sessionId) {
  return request(`/sessions/${sessionId}/clear`, { method: 'POST' });
}

// --- Chat (SSE streaming) ---

export function streamChat(sessionId, message, webSearch, files, onToken, onDone, onError) {
  const controller = new AbortController();

  const body = { session_id: sessionId, message, web_search: webSearch };
  if (files && files.length > 0) {
    body.files = files.map(({ name, type, dataUrl }) => ({ name, type, dataUrl }));
  }

  fetch(`${BASE}/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        onError(body.detail || `Chat failed: ${res.status}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            // SSE event type — handled by data line
            continue;
          }
          if (line.startsWith('data: ')) {
            const raw = line.slice(6);
            try {
              const data = JSON.parse(raw);
              if (data.token) {
                onToken(data.token);
              }
              if (data.content) {
                onDone(data.content);
              }
              if (data.error) {
                onError(data.error);
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message);
      }
    });

  return controller;
}

// --- Models ---

export async function listModels(provider, baseUrl, apiKey) {
  const params = new URLSearchParams({ provider });
  if (baseUrl) params.set('base_url', baseUrl);
  if (apiKey) params.set('api_key', apiKey);
  return request(`/models?${params}`);
}

export async function getModelInfo(modelId, provider, baseUrl, apiKey) {
  const params = new URLSearchParams({ provider });
  if (baseUrl) params.set('base_url', baseUrl);
  if (apiKey) params.set('api_key', apiKey);
  return request(`/models/${encodeURIComponent(modelId)}/info?${params}`);
}

// --- Providers ---

export async function getProviderPresets() {
  return request('/providers/presets');
}

export async function getProviderConfig() {
  return request('/providers/config');
}

export async function testConnection(provider, baseUrl, apiKey) {
  return request('/providers/test', {
    method: 'POST',
    body: JSON.stringify({ provider, base_url: baseUrl, api_key: apiKey }),
  });
}

// --- Health ---

export async function healthCheck() {
  return request('/health');
}
