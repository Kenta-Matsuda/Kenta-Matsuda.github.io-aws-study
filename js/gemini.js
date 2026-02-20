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
