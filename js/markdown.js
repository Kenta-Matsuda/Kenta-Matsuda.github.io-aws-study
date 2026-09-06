/**
 * Markdown normalization and safe rendering for AI generated text.
 *
 * Extracted from js/ui.js so the normalization rules can be unit tested without
 * a DOM (see tests/markdown-normalize.spec.mjs) and shared with the AI chat
 * (js/chat.js), which previously rendered raw model output without normalizing.
 */

/** Unicode punctuation/symbol test used by the CommonMark flanking rules. */
const PUNCT_RE = /[\p{P}\p{S}]/u;

function isPunctuation(ch) {
  return typeof ch === 'string' && ch.length > 0 && PUNCT_RE.test(ch);
}

function isWhitespace(ch) {
  return typeof ch === 'string' && /\s/.test(ch);
}

/**
 * Normalize Markdown produced by LLMs so that Japanese text renders as intended.
 *
 * Handles three classes of problems, all of them only outside fenced blocks and
 * inline code spans:
 *
 * 1. Fullwidth asterisks and invisible characters around delimiters.
 * 2. Whitespace directly inside `**` … `**` (CommonMark forbids it).
 * 3. Emphasis wrapped in Japanese brackets and glued to surrounding kana
 *    (issue #164). See padEmphasisForFlanking below.
 *
 * @param {string} markdown
 * @returns {string}
 */
export function normalizeMarkdownForJapanese(markdown) {
  const input = String(markdown ?? '');

  // Japanese IMEs/editors sometimes emit:
  // - Fullwidth asterisk: U+FF0A '＊' (looks like '*')
  // - Zero-width space/BOM around delimiters
  // These can prevent Markdown emphasis parsing (e.g. **「...」** / ＊＊「...」＊＊).
  // To avoid breaking code samples, we normalize only outside fenced/inline code.

  const FENCE_RE = /(^|\n)( {0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2\3[ \t]*($|\n)/g;
  const CODE_SPAN_RE = /`+[^`]*?`+/g;

  function normalizeTextSegment(segment) {
    let s = segment
      .replaceAll('\u200B', '')
      .replaceAll('\uFEFF', '')
      .replaceAll('\u200C', '')
      .replaceAll('\u2060', '')
      .replaceAll('＊', '*');

    // Fix emphasis broken by spaces/invisible chars adjacent to Japanese brackets.
    // CommonMark forbids whitespace right after opening ** or right before closing **.
    // AI models sometimes output: ** 「text」 ** instead of **「text」**
    s = s.replace(/(\*{2,3})[ \t\u00A0\u3000]+([「【（『])/g, '$1$2');
    s = s.replace(/([」】）』])[ \t\u00A0\u3000]+(\*{2,3})/g, '$1$2');

    return padEmphasisForFlanking(s);
  }

  function normalizeOutsideCode(segment) {
    // Preserve inline code spans as-is.
    return segment.replace(CODE_SPAN_RE, (codeSpan) => `\u0000${codeSpan}\u0000`).split('\u0000').map((part) => {
      if (part.startsWith('`')) return part;
      return normalizeTextSegment(part);
    }).join('');
  }

  // Preserve fenced code blocks as-is.
  let out = '';
  let lastIndex = 0;
  for (const match of input.matchAll(FENCE_RE)) {
    const index = match.index ?? 0;
    out += normalizeOutsideCode(input.slice(lastIndex, index));
    out += match[0];
    lastIndex = index + match[0].length;
  }
  out += normalizeOutsideCode(input.slice(lastIndex));
  return out;
}

/**
 * Insert a single space outside `**`/`***` delimiters when CommonMark's flanking
 * rules would otherwise refuse to parse the emphasis (issue #164).
 *
 * CommonMark treats a delimiter run followed by punctuation as left-flanking only
 * when the character in front of it is whitespace or punctuation. LLM answers in
 * Japanese routinely produce text like:
 *
 *   次の**「誰が聞いても同じ意味で伝わるもの」**のように
 *
 * Here the opening run is preceded by `の` (a letter) and followed by `「`
 * (punctuation), so it is not left-flanking; the closing run is preceded by `」`
 * and followed by `の`, so it is not right-flanking. Neither run participates in
 * emphasis and the asterisks are rendered literally.
 *
 * Adding one space outside the delimiters — the workaround reported in #164 —
 * satisfies both rules:
 *
 *   次の **「誰が聞いても同じ意味で伝わるもの」** のように
 *
 * The padding is applied only where it is actually required: the emphasis content
 * must start (resp. end) with punctuation and the neighbouring character must be
 * neither whitespace nor punctuation. Spans that already parse are left untouched
 * so no stray spaces appear in normal text.
 *
 * @param {string} text
 * @returns {string}
 */
function padEmphasisForFlanking(text) {
  const EMPHASIS_RE = /(\*{2,3})([^\s*][^*]*?)\1/gu;
  return text.replace(EMPHASIS_RE, (match, stars, content, offset, whole) => {
    const prev = offset > 0 ? whole[offset - 1] : '';
    const nextIndex = offset + match.length;
    const next = nextIndex < whole.length ? whole[nextIndex] : '';

    const firstChar = content[0] ?? '';
    const lastChar = content[content.length - 1] ?? '';

    const needsLeadingPad =
      isPunctuation(firstChar) && prev !== '' && !isWhitespace(prev) && !isPunctuation(prev);
    const needsTrailingPad =
      isPunctuation(lastChar) && next !== '' && !isWhitespace(next) && !isPunctuation(next);

    if (!needsLeadingPad && !needsTrailingPad) return match;
    return `${needsLeadingPad ? ' ' : ''}${match}${needsTrailingPad ? ' ' : ''}`;
  });
}

let __markedConfigured = false;

function configureMarkedOnce(marked) {
  if (__markedConfigured) return;
  if (!marked || typeof marked.setOptions !== 'function') return;
  try {
    // keep it simple: gfm + line breaks
    marked.setOptions({ gfm: true, breaks: true });
    __markedConfigured = true;
  } catch {
    // ignore
  }
}

/**
 * Normalize, render and sanitize Markdown.
 * Returns `usedMarkdown: false` when marked/DOMPurify are unavailable so callers
 * can fall back to plain text.
 *
 * @param {string} markdown
 * @returns {{ html: string, usedMarkdown: boolean }}
 */
export function renderMarkdownToSafeHtml(markdown) {
  const md = normalizeMarkdownForJapanese(markdown);

  const marked = typeof window !== 'undefined' ? window.marked : undefined;
  const DOMPurify = typeof window !== 'undefined' ? window.DOMPurify : undefined;

  if (!marked || typeof marked.parse !== 'function' || !DOMPurify || typeof DOMPurify.sanitize !== 'function') {
    return { html: '', usedMarkdown: false };
  }

  configureMarkedOnce(marked);

  const rawHtml = marked.parse(md);
  const cleanHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
  return { html: cleanHtml, usedMarkdown: true };
}
