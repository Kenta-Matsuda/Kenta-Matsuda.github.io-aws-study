/**
 * AI provider façade.
 *
 * Decides whether to use Gemini or OpenAI based on the user's
 * stored preference and available API keys, then delegates to
 * the appropriate module.
 */

import { callGemini, callGeminiStream } from './gemini.js';
import { callOpenAi, callOpenAiStream } from './openai.js';
import { getAiProvider, getApiKey, getOpenAiApiKey } from './storage.js';

/**
 * Determine which provider to actually use.
 * Falls back gracefully: if the preferred provider has no key, try the other.
 */
function resolveProvider() {
  const pref = getAiProvider(); // 'gemini' | 'openai'

  const hasGemini = Boolean(getApiKey());
  const hasOpenAi = Boolean(getOpenAiApiKey());

  if (pref === 'openai' && hasOpenAi) return 'openai';
  if (pref === 'gemini' && hasGemini) return 'gemini';

  // Preferred key missing → fall back to whichever is available
  if (hasOpenAi) return 'openai';
  if (hasGemini) return 'gemini';

  // Neither key set → return preference so the "require key" callback fires
  return pref || 'gemini';
}

export function getActiveProviderLabel() {
  const p = resolveProvider();
  return p === 'openai' ? 'OpenAI' : 'Gemini';
}

/**
 * Non-streaming AI call (provider-agnostic).
 */
export async function callAi({ userPrompt, systemPrompt, onRequireApiKey }) {
  const provider = resolveProvider();

  if (provider === 'openai') {
    return callOpenAi({ userPrompt, systemPrompt, onRequireApiKey });
  }
  return callGemini({ userPrompt, systemPrompt, onRequireApiKey });
}

/**
 * Streaming AI call (provider-agnostic).
 */
export async function callAiStream({ userPrompt, systemPrompt, onRequireApiKey, onTextDelta }) {
  const provider = resolveProvider();

  if (provider === 'openai') {
    return callOpenAiStream({ userPrompt, systemPrompt, onRequireApiKey, onTextDelta });
  }
  return callGeminiStream({ userPrompt, systemPrompt, onRequireApiKey, onTextDelta });
}
