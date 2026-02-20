import { getApiKey } from './storage.js';
import { GEMINI_MODEL_CANDIDATES } from './config.js';

const DEFAULT_MODEL_CANDIDATES = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

function getModelCandidates() {
  const fromConfig = Array.isArray(GEMINI_MODEL_CANDIDATES) ? GEMINI_MODEL_CANDIDATES : null;
  const list = (fromConfig?.length ? fromConfig : DEFAULT_MODEL_CANDIDATES)
    .map((m) => String(m || '').trim())
    .map((m) => (m.startsWith('models/') ? m.slice('models/'.length) : m))
    .filter(Boolean);
  // De-dup while preserving order
  return Array.from(new Set(list));
}

async function readErrorMessage(response) {
  try {
    const data = await response.json();
    const msg = data?.error?.message;
    return msg ? String(msg) : null;
  } catch {
    return null;
  }
}

function buildUrl({ model, apiKey }) {
  const m = encodeURIComponent(String(model));
  return `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
}

function buildStreamUrl({ model, apiKey }) {
  const m = encodeURIComponent(String(model));
  // SSE stream
  return `https://generativelanguage.googleapis.com/v1beta/models/${m}:streamGenerateContent?alt=sse&key=${apiKey}`;
}

function extractTextFromCandidatePayload(payload) {
  if (!payload) return '';

  const candidate = Array.isArray(payload?.candidates) ? payload.candidates[0] : null;
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((p) => (p && typeof p.text === 'string' ? p.text : ''))
    .filter(Boolean)
    .join('');
}

async function consumeSseText({ response, onTextDelta }) {
  if (!response?.body || typeof response.body.getReader !== 'function') {
    throw new Error('ストリーミングに対応していない環境です。');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  let buffer = '';
  let accumulated = '';

  const flushEvent = (rawEvent) => {
    const lines = String(rawEvent || '')
      .replace(/\r\n/g, '\n')
      .split('\n');
    const dataLines = lines
      .map((l) => l.trimEnd())
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice('data:'.length).trimStart());
    if (!dataLines.length) return;
    const dataStr = dataLines.join('\n').trim();
    if (!dataStr || dataStr === '[DONE]') return;

    let parsed;
    try {
      parsed = JSON.parse(dataStr);
    } catch {
      return;
    }

    const payloads = Array.isArray(parsed) ? parsed : [parsed];
    for (const payload of payloads) {
      const text = extractTextFromCandidatePayload(payload);
      if (!text) continue;

      // The API may send full-so-far text or incremental chunks; normalize to delta.
      let delta = text;
      if (accumulated && text.startsWith(accumulated)) {
        delta = text.slice(accumulated.length);
        accumulated = text;
      } else {
        accumulated += text;
      }

      if (delta) onTextDelta?.(delta, accumulated);
    }
  };

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, '\n');

    // SSE events are separated by a blank line
    let sep;
    // eslint-disable-next-line no-cond-assign
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      flushEvent(rawEvent);
    }
  }

  // Flush remaining buffer if it ends without the final separator.
  if (buffer.trim()) flushEvent(buffer);

  return accumulated;
}

export async function callGemini({ userPrompt, systemPrompt, onRequireApiKey }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    onRequireApiKey?.();
    return null;
  }

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  const delays = [1000, 2000, 4000];

  const models = getModelCandidates();
  let lastError = null;

  for (const model of models) {
    const url = buildUrl({ model, apiKey });

    for (let i = 0; i < 3; i += 1) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          // 404 is often "model not found" or model not enabled for the API key.
          if (response.status === 404) {
            const detail = await readErrorMessage(response);
            lastError = new Error(detail || `Server Error: 404 (model: ${model})`);
            break; // try next model
          }

          if (response.status === 400 || response.status === 401 || response.status === 403) {
            const detail = await readErrorMessage(response);
            throw new Error(
              detail || 'APIキーが無効であるか、権限がありません。設定を確認してください。'
            );
          }

          if (response.status === 429) {
            // rate limit: retry
            const detail = await readErrorMessage(response);
            lastError = new Error(detail || '混雑しています（429）。少し待って再試行してください。');
            if (i === 2) throw lastError;
            await new Promise((r) => setTimeout(r, delays[i]));
            continue;
          }

          const detail = await readErrorMessage(response);
          lastError = new Error(detail || `Server Error: ${response.status}`);
          if (i === 2) throw lastError;
          await new Promise((r) => setTimeout(r, delays[i]));
          continue;
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '回答を生成できませんでした。';
      } catch (e) {
        lastError = e;
        if (i === 2) break;
        await new Promise((r) => setTimeout(r, delays[i]));
      }
    }
  }

  const msg = lastError?.message ? String(lastError.message) : '不明なエラー';
  return `エラーが発生しました: ${msg}`;
}

export async function callGeminiStream({
  userPrompt,
  systemPrompt,
  onRequireApiKey,
  onTextDelta,
}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    onRequireApiKey?.();
    return null;
  }

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  const delays = [1000, 2000, 4000];
  const models = getModelCandidates();
  let lastError = null;

  for (const model of models) {
    const url = buildStreamUrl({ model, apiKey });

    for (let i = 0; i < 3; i += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          if (response.status === 404) {
            const detail = await readErrorMessage(response);
            lastError = new Error(detail || `Server Error: 404 (model: ${model})`);
            break;
          }

          if (response.status === 400 || response.status === 401 || response.status === 403) {
            const detail = await readErrorMessage(response);
            throw new Error(
              detail || 'APIキーが無効であるか、権限がありません。設定を確認してください。'
            );
          }

          if (response.status === 429) {
            const detail = await readErrorMessage(response);
            lastError = new Error(detail || '混雑しています（429）。少し待って再試行してください。');
            if (i === 2) throw lastError;
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, delays[i]));
            continue;
          }

          const detail = await readErrorMessage(response);
          lastError = new Error(detail || `Server Error: ${response.status}`);
          if (i === 2) throw lastError;
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, delays[i]));
          continue;
        }

        // eslint-disable-next-line no-await-in-loop
        const finalText = await consumeSseText({ response, onTextDelta });
        return finalText || '回答を生成できませんでした。';
      } catch (e) {
        lastError = e;
        if (i === 2) break;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, delays[i]));
      }
    }
  }

  const msg = lastError?.message ? String(lastError.message) : '不明なエラー';
  return `エラーが発生しました: ${msg}`;
}
