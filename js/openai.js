import { getOpenAiApiKey } from './storage.js';
import { OPENAI_MODEL_CANDIDATES } from './config.js';

const DEFAULT_MODEL_CANDIDATES = ['gpt-5-mini', 'gpt-5'];

function getModelCandidates() {
  const fromConfig = Array.isArray(OPENAI_MODEL_CANDIDATES) ? OPENAI_MODEL_CANDIDATES : null;
  const list = (fromConfig?.length ? fromConfig : DEFAULT_MODEL_CANDIDATES)
    .map((m) => String(m || '').trim())
    .filter(Boolean);
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

/**
 * Non-streaming call to OpenAI Chat Completions API.
 */
export async function callOpenAi({ userPrompt, systemPrompt, onRequireApiKey, history }) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    onRequireApiKey?.();
    return null;
  }

  const delays = [1000, 2000, 4000];
  const models = getModelCandidates();
  let lastError = null;

  // Build messages array: system + history (if any) + current user message
  const messages = [{ role: 'system', content: systemPrompt }];
  if (Array.isArray(history)) {
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: 'user', content: userPrompt });

  for (const model of models) {
    for (let i = 0; i < 3; i += 1) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          if (response.status === 404) {
            const detail = await readErrorMessage(response);
            lastError = new Error(detail || `Model not found: ${model}`);
            break; // try next model
          }

          if (response.status === 401 || response.status === 403) {
            const detail = await readErrorMessage(response);
            throw new Error(
              detail || 'APIキーが無効であるか、権限がありません。設定を確認してください。'
            );
          }

          if (response.status === 429) {
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
        return data.choices?.[0]?.message?.content || '回答を生成できませんでした。';
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

/**
 * Streaming call to OpenAI Chat Completions API.
 */
export async function callOpenAiStream({ userPrompt, systemPrompt, onRequireApiKey, onTextDelta, history }) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    onRequireApiKey?.();
    return null;
  }

  const delays = [1000, 2000, 4000];
  const models = getModelCandidates();
  let lastError = null;

  // Build messages array: system + history (if any) + current user message
  const messages = [{ role: 'system', content: systemPrompt }];
  if (Array.isArray(history)) {
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: 'user', content: userPrompt });

  for (const model of models) {
    for (let i = 0; i < 3; i += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            stream: true,
          }),
        });

        if (!response.ok) {
          if (response.status === 404) {
            const detail = await readErrorMessage(response);
            lastError = new Error(detail || `Model not found: ${model}`);
            break;
          }

          if (response.status === 401 || response.status === 403) {
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
        const fullText = await consumeOpenAiSse({ response, onTextDelta });
        return fullText || '回答を生成できませんでした。';
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

async function consumeOpenAiSse({ response, onTextDelta }) {
  if (!response?.body || typeof response.body.getReader !== 'function') {
    throw new Error('ストリーミングに対応していない環境です。');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  let buffer = '';
  let accumulated = '';

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, '\n');

    const lines = buffer.split('\n');
    // Keep the last (possibly incomplete) line in the buffer
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue; // comment or empty
      if (!trimmed.startsWith('data:')) continue;

      const dataStr = trimmed.slice('data:'.length).trim();
      if (dataStr === '[DONE]') continue;

      let parsed;
      try {
        parsed = JSON.parse(dataStr);
      } catch {
        continue;
      }

      const delta = parsed.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta) {
        accumulated += delta;
        onTextDelta?.(delta, accumulated);
      }
    }
  }

  // Flush remaining buffer
  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith('data:')) {
      const dataStr = trimmed.slice('data:'.length).trim();
      if (dataStr && dataStr !== '[DONE]') {
        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta) {
            accumulated += delta;
            onTextDelta?.(delta, accumulated);
          }
        } catch {
          // ignore
        }
      }
    }
  }

  return accumulated;
}
