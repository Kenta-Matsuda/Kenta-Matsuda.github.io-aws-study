/**
 * AI provider façade.
 *
 * Decides whether to use Gemini or OpenAI based on the user's
 * stored preference and available API keys, then delegates to
 * the appropriate module.
 */

import { callGemini, callGeminiStream, getPreferredGemini3Model } from './gemini.js';
import { callOpenAi, callOpenAiStream } from './openai.js';
import { callGeminiBatch } from './geminiBatch.js';
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

const BATCH_DISABLED_KEY = 'gemini_batch_unavailable';

/** Mark Batch API as unavailable for the current API key (persists). */
export function markAiBatchUnavailable() {
  try { localStorage.setItem(BATCH_DISABLED_KEY, '1'); } catch { /* ignore */ }
}

/** Clear the "batch unavailable" flag (e.g. when API key changes). */
export function clearAiBatchUnavailable() {
  try { localStorage.removeItem(BATCH_DISABLED_KEY); } catch { /* ignore */ }
}

function isBatchKnownUnavailable() {
  try { return localStorage.getItem(BATCH_DISABLED_KEY) === '1'; } catch { return false; }
}

/**
 * Returns true when the current provider/model combination
 * is eligible for the Gemini Batch API (Gemini provider + Gemini 3 model)
 * AND the Batch API hasn't already been observed to be unavailable.
 */
export function isAiBatchEligible() {
  if (isBatchKnownUnavailable()) return false;
  return resolveProvider() === 'gemini' && Boolean(getPreferredGemini3Model());
}

/**
 * Non-streaming AI call (provider-agnostic).
 * @param {Array<{role: string, content: string}>} [history] - conversation history for multi-turn chat
 */
export async function callAi({ userPrompt, systemPrompt, onRequireApiKey, history }) {
  const provider = resolveProvider();

  if (provider === 'openai') {
    return callOpenAi({ userPrompt, systemPrompt, onRequireApiKey, history });
  }
  return callGemini({ userPrompt, systemPrompt, onRequireApiKey, history });
}

/**
 * Streaming AI call (provider-agnostic).
 * @param {Array<{role: string, content: string}>} [history] - conversation history for multi-turn chat
 */
export async function callAiStream({ userPrompt, systemPrompt, onRequireApiKey, onTextDelta, history }) {
  const provider = resolveProvider();

  if (provider === 'openai') {
    return callOpenAiStream({ userPrompt, systemPrompt, onRequireApiKey, onTextDelta, history });
  }
  return callGeminiStream({ userPrompt, systemPrompt, onRequireApiKey, onTextDelta, history });
}

/**
 * Batch AI call. Currently only supported for Gemini 3 family models
 * (which is when the Batch API gives the best cost/throughput tradeoff).
 *
 * Returns null when the active provider/model is not eligible for batching,
 * so callers can fall back to per-request calls.
 *
 * @param {Object} opts
 * @param {Array<{userPrompt:string,systemPrompt:string,history?:Array}>} opts.requests
 * @param {string} [opts.displayName]
 * @param {(info:{state:string,done:number,total:number,failed:number,pending:number})=>void} [opts.onProgress]
 * @param {() => void} [opts.onRequireApiKey]
 * @param {() => boolean} [opts.shouldAbort]
 * @returns {Promise<{ texts:(string|null)[], errors:(string|null)[], model:string } | null>}
 */
export async function callAiBatch({
  requests,
  displayName,
  onProgress,
  onRequireApiKey,
  shouldAbort,
}) {
  const provider = resolveProvider();
  if (provider !== 'gemini') return null;

  const model = getPreferredGemini3Model();
  if (!model) return null;

  const result = await callGeminiBatch({
    model,
    requests,
    displayName,
    onProgress,
    onRequireApiKey,
    shouldAbort,
  });
  if (!result) return null;
  return { ...result, model };
}
