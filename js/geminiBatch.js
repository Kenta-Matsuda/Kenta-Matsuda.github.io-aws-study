/**
 * Gemini Batch API client.
 *
 * Submits a batch of GenerateContent requests, polls until completion,
 * and returns the inline responses in the original order.
 *
 * 公式ドキュメント:
 * https://ai.google.dev/gemini-api/docs/batch-api?hl=ja
 * https://ai.google.dev/api/batch-mode?hl=ja
 */

import { getApiKey } from './storage.js';

function buildBatchCreateUrl({ model, apiKey }) {
  const m = encodeURIComponent(String(model));
  return `https://generativelanguage.googleapis.com/v1beta/models/${m}:batchGenerateContent?key=${apiKey}`;
}

function buildBatchGetUrl({ name, apiKey }) {
  // name is like "batches/abcdef..."
  return `https://generativelanguage.googleapis.com/v1beta/${name}?key=${apiKey}`;
}

function buildBatchCancelUrl({ name, apiKey }) {
  return `https://generativelanguage.googleapis.com/v1beta/${name}:cancel?key=${apiKey}`;
}

async function readErrorMessage(response) {
  try {
    const data = await response.json();
    return data?.error?.message ? String(data.error.message) : null;
  } catch {
    return null;
  }
}

function extractTextFromGenerateContentResponse(payload) {
  if (!payload) return '';
  const candidate = Array.isArray(payload?.candidates) ? payload.candidates[0] : null;
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((p) => (p && typeof p.text === 'string' ? p.text : ''))
    .filter(Boolean)
    .join('');
}

const COMPLETED_STATES = new Set([
  'JOB_STATE_SUCCEEDED',
  'BATCH_STATE_SUCCEEDED',
  'JOB_STATE_FAILED',
  'BATCH_STATE_FAILED',
  'JOB_STATE_CANCELLED',
  'BATCH_STATE_CANCELLED',
  'JOB_STATE_EXPIRED',
  'BATCH_STATE_EXPIRED',
]);

const SUCCEEDED_STATES = new Set(['JOB_STATE_SUCCEEDED', 'BATCH_STATE_SUCCEEDED']);

/**
 * @typedef {Object} BatchRequestItem
 * @property {string} userPrompt
 * @property {string} systemPrompt
 * @property {Array<{role:string,content:string}>} [history]
 */

/**
 * Submit a batch and wait for results.
 *
 * @param {Object} opts
 * @param {string} opts.model - model id (e.g. 'gemini-3.1-flash-lite')
 * @param {BatchRequestItem[]} opts.requests
 * @param {string} [opts.displayName]
 * @param {(info:{state:string,done:number,total:number,failed:number,pending:number})=>void} [opts.onProgress]
 * @param {(info:{name:string})=>void} [opts.onCreated] called once the job exists, with its
 *   resource name ("batches/…"). Persist it to resume polling after a reload (see pollGeminiBatch).
 * @param {() => void} [opts.onRequireApiKey]
 * @param {number} [opts.pollIntervalMs] default 5000
 * @param {() => boolean} [opts.shouldAbort] called between polls; if true, attempt cancel and throw
 * @returns {Promise<{ texts: (string|null)[], errors: (string|null)[], name: string }>}
 *   The arrays match the request order.
 */
export async function callGeminiBatch({
  model,
  requests,
  displayName,
  onProgress,
  onCreated,
  onRequireApiKey,
  pollIntervalMs,
  shouldAbort,
}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    onRequireApiKey?.();
    return null;
  }

  if (!Array.isArray(requests) || requests.length === 0) {
    return { texts: [], errors: [] };
  }

  const batchName = await submitGeminiBatch({ model, requests, displayName });
  onCreated?.({ name: batchName });

  onProgress?.({
    state: 'JOB_STATE_PENDING',
    done: 0,
    total: requests.length,
    failed: 0,
    pending: requests.length,
  });

  // 2) Poll for completion
  const result = await pollGeminiBatch({ name: batchName, total: requests.length, onProgress, pollIntervalMs, shouldAbort });
  return { ...result, name: batchName };
}

/**
 * Create a batch job and return its resource name without waiting for it.
 *
 * Used by the job chain (js/examBatchChain.js, PR 6b) where each stage's job
 * name is persisted first and polled separately — possibly on a later visit.
 *
 * @param {{ model: string, requests: BatchRequestItem[], displayName?: string }} opts
 * @returns {Promise<string>} resource name ("batches/…")
 * @throws {Error} with `status` when the create call fails (e.g. 400 FAILED_PRECONDITION
 *   for keys without Batch access)
 */
export async function submitGeminiBatch({ model, requests, displayName }) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API キーが設定されていません。');
  if (!Array.isArray(requests) || requests.length === 0) throw new Error('バッチに含めるリクエストがありません。');

  // Build inline requests payload
  const inlineRequests = requests.map((r, i) => {
    const contents = [];
    if (Array.isArray(r.history)) {
      for (const msg of r.history) {
        const role = msg.role === 'assistant' ? 'model' : msg.role;
        contents.push({ role, parts: [{ text: msg.content }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: r.userPrompt }] });

    const generateRequest = {
      contents,
    };
    if (r.systemPrompt) {
      generateRequest.systemInstruction = { parts: [{ text: r.systemPrompt }] };
    }

    return {
      request: generateRequest,
      metadata: { key: `request-${i}` },
    };
  });

  const createBody = {
    batch: {
      displayName: displayName || `quiz-batch-${Date.now()}`,
      inputConfig: {
        requests: {
          requests: inlineRequests,
        },
      },
    },
  };

  // 1) Create the batch job
  const createUrl = buildBatchCreateUrl({ model, apiKey });
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createBody),
  });

  if (!createRes.ok) {
    const detail = await readErrorMessage(createRes);
    // eslint-disable-next-line no-console
    console.error('[geminiBatch] create failed', createRes.status, detail);
    const err = new Error(detail || `バッチ作成に失敗しました: ${createRes.status}`);
    err.status = createRes.status;
    throw err;
  }

  const createData = await createRes.json();
  // eslint-disable-next-line no-console
  console.log('[geminiBatch] create response:', createData);

  // Extract resource name. The shape can vary:
  //   - Operation:        { name: "batches/xxx" or "operations/xxx", metadata: { name: "batches/xxx", ... }, done: false }
  //   - GenerateContentBatch directly (rare)
  function extractBatchName(d) {
    const candidates = [
      d?.metadata?.name,
      d?.name,
      d?.response?.name,
    ].filter((v) => typeof v === 'string' && v.length > 0);
    // Prefer ones starting with "batches/"
    return candidates.find((s) => s.startsWith('batches/')) || candidates[0] || null;
  }
  const batchName = extractBatchName(createData);

  if (!batchName) {
    // eslint-disable-next-line no-console
    console.error('[geminiBatch] could not extract batch name from response:', createData);
    throw new Error('バッチジョブのリソース名を取得できませんでした。');
  }
  // eslint-disable-next-line no-console
  console.log('[geminiBatch] created resource:', batchName);
  return batchName;
}

// Tests shorten the poll interval through this global; production uses 5 s.
function defaultPollIntervalMs() {
  const override = typeof globalThis !== 'undefined' ? Number(globalThis.__ASN_BATCH_POLL_MS__) : NaN;
  return Number.isFinite(override) && override > 0 ? override : 5000;
}

/**
 * Poll an existing batch job until it completes and return its results.
 *
 * Separate from callGeminiBatch so a job whose name was persisted before the
 * page was closed can be resumed on the next visit (issue #225, design §6.1):
 * the job keeps running on Google's side regardless of the browser.
 *
 * @param {Object} opts
 * @param {string} opts.name  resource name ("batches/…")
 * @param {number} opts.total number of requests in the job (sizes the result arrays)
 * @param {(info:{state:string,done:number,total:number,failed:number,pending:number})=>void} [opts.onProgress]
 * @param {number} [opts.pollIntervalMs]
 * @param {() => boolean} [opts.shouldAbort]
 * @returns {Promise<{ texts: (string|null)[], errors: (string|null)[] }>}
 */
export async function pollGeminiBatch({ name, total, onProgress, pollIntervalMs, shouldAbort }) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API キーが設定されていません。');
  const batchName = String(name || '');
  if (!batchName) throw new Error('バッチジョブ名が指定されていません。');
  const requestCount = Math.max(0, Number(total) || 0);
  const interval = pollIntervalMs || defaultPollIntervalMs();

  // batchName is "batches/xxx" — use directly. (For operations/xxx fall back to /v1beta/{name})
  const pollName = batchName.startsWith('batches/') || batchName.startsWith('operations/')
    ? batchName
    : `batches/${batchName}`;
  const getUrl = buildBatchGetUrl({ name: pollName, apiKey });
  let lastState = 'JOB_STATE_PENDING';
  // Cap retries on transient errors
  let consecutiveErrors = 0;

  while (true) {
    if (shouldAbort && shouldAbort()) {
      // Best-effort cancel
      try {
        await fetch(buildBatchCancelUrl({ name: batchName, apiKey }), { method: 'POST' });
      } catch {
        /* ignore */
      }
      const err = new Error('バッチ処理がキャンセルされました。');
      err.cancelled = true;
      throw err;
    }

    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, interval));

    let getRes;
    try {
      // eslint-disable-next-line no-await-in-loop
      getRes = await fetch(getUrl);
    } catch (e) {
      consecutiveErrors += 1;
      if (consecutiveErrors >= 5) throw e;
      continue;
    }

    if (!getRes.ok) {
      consecutiveErrors += 1;
      if (consecutiveErrors >= 5) {
        const detail = await readErrorMessage(getRes);
        throw new Error(detail || `バッチ状態取得に失敗しました: ${getRes.status}`);
      }
      continue;
    }
    consecutiveErrors = 0;

    // eslint-disable-next-line no-await-in-loop
    const data = await getRes.json();
    // eslint-disable-next-line no-console
    console.log('[geminiBatch] poll', pollName, data);
    // The shape can be either an Operation (with metadata.state) or a GenerateContentBatch.
    const batchObj = data?.metadata && data.metadata['@type'] ? data.metadata : data;

    const state =
      batchObj?.state || data?.metadata?.state || data?.state || 'JOB_STATE_RUNNING';
    const stats = batchObj?.batchStats || data?.metadata?.batchStats || {};
    const total = Number(stats.requestCount || requestCount);
    const success = Number(stats.successfulRequestCount || 0);
    const failed = Number(stats.failedRequestCount || 0);
    const pending = Number(stats.pendingRequestCount || total - success - failed);

    if (state !== lastState || success || failed) {
      onProgress?.({
        state,
        done: success + failed,
        total,
        failed,
        pending,
      });
      lastState = state;
    }

    if (COMPLETED_STATES.has(state)) {
      if (!SUCCEEDED_STATES.has(state)) {
        const errMsg = data?.error?.message || batchObj?.error?.message || `バッチが ${state} で終了しました。`;
        throw new Error(errMsg);
      }

      // 3) Extract results
      // Operation.response (when done=true) holds the GenerateContentBatch resource.
      const resultBatch = data?.response || batchObj || data;
      const output = resultBatch?.output || resultBatch?.dest;
      const inlined =
        output?.inlinedResponses?.inlinedResponses ||
        output?.inlinedResponses ||
        [];

      const size = Math.max(requestCount, inlined.length);
      const texts = new Array(size).fill(null);
      const errors = new Array(size).fill(null);

      // Prefer matching by metadata.key when available; otherwise fall back to order.
      for (let i = 0; i < inlined.length; i += 1) {
        const item = inlined[i];
        let idx = i;
        const keyStr =
          (item?.metadata && (item.metadata.key || item.metadata['key'])) || null;
        if (typeof keyStr === 'string') {
          const m = keyStr.match(/request-(\d+)/);
          if (m) idx = Number(m[1]);
        }
        if (idx < 0 || idx >= size) continue;

        if (item?.response) {
          texts[idx] = extractTextFromGenerateContentResponse(item.response);
        } else if (item?.error) {
          errors[idx] = item.error.message || String(item.error.code || 'error');
        }
      }

      return { texts, errors };
    }
  }
}
