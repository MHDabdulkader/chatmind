// Base API client for ChatMind
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function checkHealth(timeoutMs = 5000) {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// Auto-wake Render free backend if sleeping (inactivity spin-down)
export async function wakeUpBackend(maxWaitSeconds = 60, onTick = () => {}) {
  const start = Date.now();
  while (Date.now() - start < maxWaitSeconds * 1000) {
    const elapsed = Math.round((Date.now() - start) / 1000);
    onTick(elapsed);
    const health = await checkHealth(4000);
    if (health) return true;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

// Models
export async function getModels(live = false) {
  try {
    const res = await fetch(`${API_BASE}/models?live=${live}`);
    if (!res.ok) throw new Error('Failed to fetch models');
    return await res.json();
  } catch (err) {
    console.error('getModels error:', err);
    return [
      { id: 'nvidia/nemotron-3.5-super-vl:free', name: 'Nemotron 3.5 Super VL (free)', free: true, default: true }
    ];
  }
}

// Projects
export async function getProjects() {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return await res.json();
}

export async function createProject(data) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return await res.json();
}

export async function getProjectStats(pid) {
  const res = await fetch(`${API_BASE}/projects/${pid}/stats`);
  if (!res.ok) throw new Error('Failed to fetch project stats');
  return await res.json();
}

export async function runSynthesis(pid, model = null) {
  const url = model 
    ? `${API_BASE}/projects/${pid}/synthesis?model=${encodeURIComponent(model)}`
    : `${API_BASE}/projects/${pid}/synthesis`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to run synthesis');
  return await res.json();
}

export async function exportProjectPdf(pid, findings = null) {
  const res = await fetch(`${API_BASE}/projects/${pid}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ findings }),
  });
  if (!res.ok) throw new Error('Failed to export PDF');
  return await res.blob();
}

export async function deleteProject(pid) {
  const res = await fetch(`${API_BASE}/projects/${pid}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete project');
  return await res.json();
}

// Documents
export async function getDocuments(projectId = null) {
  const url = projectId ? `${API_BASE}/documents?project_id=${projectId}` : `${API_BASE}/documents`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return await res.json();
}

export async function uploadDocument(file, projectId = 'default') {
  const form = new FormData();
  form.append('file', file);
  form.append('project_id', projectId);
  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to upload document');
  }
  return await res.json();
}

export async function addDocumentUrl(url, projectId = 'default') {
  const res = await fetch(`${API_BASE}/documents/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, project_id: projectId }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Failed to add URL');
  }
  return await res.json();
}

export async function deleteDocument(docId) {
  const res = await fetch(`${API_BASE}/documents/${docId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete document');
  return await res.json();
}

// Prompts
export async function getPrompts(query = '', category = '', pinned = null) {
  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (category && category !== 'All') params.append('category', category);
  if (pinned !== null) params.append('pinned', pinned);

  const res = await fetch(`${API_BASE}/prompts?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch prompts');
  return await res.json();
}

export async function createPrompt(data) {
  const res = await fetch(`${API_BASE}/prompts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create prompt');
  return await res.json();
}

export async function updatePrompt(pid, data) {
  const res = await fetch(`${API_BASE}/prompts/${pid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update prompt');
  return await res.json();
}

export async function togglePinPrompt(pid) {
  const res = await fetch(`${API_BASE}/prompts/${pid}/pin`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle pin');
  return await res.json();
}

export async function deletePrompt(pid) {
  const res = await fetch(`${API_BASE}/prompts/${pid}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete prompt');
  return await res.json();
}

// Threads
export async function getThreads(projectId = null) {
  const url = projectId ? `${API_BASE}/threads?project_id=${projectId}` : `${API_BASE}/threads`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch threads');
  return await res.json();
}

export async function getThreadMessages(tid) {
  const res = await fetch(`${API_BASE}/threads/${tid}/messages`);
  if (!res.ok) throw new Error('Failed to fetch thread messages');
  return await res.json();
}

export async function renameThread(tid, title) {
  const res = await fetch(`${API_BASE}/threads/${tid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to rename thread');
  return await res.json();
}

export async function deleteThread(tid) {
  const res = await fetch(`${API_BASE}/threads/${tid}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete thread');
  return await res.json();
}

// Streaming Chat over SSE
export async function streamChat({
  message,
  threadId = null,
  model = null,
  projectId = null,
  allowWeb = true,
  onThread = () => {},
  onStep = () => {},
  onToken = () => {},
  onDone = () => {},
  onError = () => {},
  onLimitExceeded = () => {},
  signal = null,
}) {
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        thread_id: threadId,
        model,
        project_id: projectId,
        allow_web: allowWeb,
      }),
      signal,
    });

    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}: ${res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        if (!part.trim()) continue;
        const lines = part.split('\n');
        let event = 'message';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            event = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataStr = line.slice(5).trim();
          }
        }

        let parsedData = dataStr;
        try {
          parsedData = JSON.parse(dataStr);
        } catch {
          // keep as string
        }

        switch (event) {
          case 'thread':
            onThread(parsedData);
            break;
          case 'limit_exceeded':
            onLimitExceeded(parsedData);
            break;
          case 'step':
            onStep(parsedData);
            break;
          case 'token':
            onToken(parsedData);
            break;
          case 'done':
            onDone(parsedData);
            break;
          case 'error':
            onError(parsedData);
            break;
        }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      onError(err.message || 'Stream connection failed');
    }
  }
}
