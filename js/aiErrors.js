/**
 * Classification of AI request failures (issue #169).
 *
 * `fetch()` rejects with a bare `TypeError: Failed to fetch` when the connection
 * drops — for example when the phone switches from mobile data to Wi-Fi in the
 * middle of a streamed generation. Surfacing that raw message tells the user
 * nothing, so the provider modules map the failure to an actionable sentence.
 *
 * Kept free of DOM/i18n dependencies so it can be unit tested.
 */

/** @typedef {'offline' | 'network' | 'aborted' | 'unknown'} AiFailureKind */

const NETWORK_MESSAGE_RE = /(failed to fetch|network\s?error|network request failed|load failed|networkerror|err_(network|internet_disconnected|connection[_a-z]*)|connection (was )?(closed|reset|aborted)|socket hang up|fetch failed)/i;

/**
 * Classify a thrown error from an AI provider call.
 *
 * @param {unknown} error
 * @param {{ online?: boolean }} [opts] - `online` should be `navigator.onLine`.
 * @returns {AiFailureKind}
 */
export function classifyAiFailure(error, opts = {}) {
  const online = opts.online === undefined ? true : Boolean(opts.online);
  const name = (error && typeof error === 'object' && 'name' in error) ? String(error.name || '') : '';
  const message = (error && typeof error === 'object' && 'message' in error) ? String(error.message || '') : String(error ?? '');

  if (name === 'AbortError') return 'aborted';

  const looksNetwork = name === 'TypeError' || NETWORK_MESSAGE_RE.test(message);
  if (!looksNetwork) return 'unknown';

  // The browser knowing it is offline is the strongest signal we can give back.
  return online ? 'network' : 'offline';
}

/**
 * i18n key describing the failure, or null when we have nothing better to say
 * than the raw error message.
 *
 * @param {AiFailureKind} kind
 * @returns {string | null}
 */
export function aiFailureMessageKey(kind) {
  switch (kind) {
    case 'offline':
      return 'errors.offline';
    case 'network':
      return 'errors.networkInterrupted';
    case 'aborted':
      return 'errors.aborted';
    default:
      return null;
  }
}

/**
 * Read `navigator.onLine` defensively (non-browser runtimes have no navigator).
 * @returns {boolean}
 */
export function isOnline() {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') return true;
  return navigator.onLine;
}
