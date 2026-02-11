import { getApiKey } from './storage.js';

const GEMINI_MODEL = 'gemini-2.5-flash-preview-09-2025';

export async function callGemini({ userPrompt, systemPrompt, onRequireApiKey }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    onRequireApiKey?.();
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  const delays = [1000, 2000, 4000];

  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 400 || response.status === 403) {
          throw new Error('APIキーが無効であるか、権限がありません。設定を確認してください。');
        }
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '回答を生成できませんでした。';
    } catch (e) {
      if (i === 2) return `エラーが発生しました: ${e.message}`;
      await new Promise((r) => setTimeout(r, delays[i]));
    }
  }

  return '回答を生成できませんでした。';
}
