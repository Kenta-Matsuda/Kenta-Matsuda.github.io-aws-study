// 公開（UIで選択可能）にする試験IDをここで制御します。
// まずは ANS と CLF を公開（切り替え動作確認用）。
export const PUBLIC_EXAM_IDS = ['clf-c02', 'aif-c01', 'saa-c03', 'sap-c02', 'ans-c01', 'dva-c02', 'mla-c01', 'dea-c01', 'soa-c03', 'dop-c02', 'aip-c01', 'scs-c03'];

export const DEFAULT_EXAM_ID = 'clf-c02';

// Gemini models change over time; keep a small fallback list.
// The app will try these in order when calling the API.
export const GEMINI_MODEL_CANDIDATES = [
	// Prefer latest preview first (Google may change availability over time)
	'gemini-3.1-flash-lite-preview',

	// Fallbacks
	'gemini-2.5-flash',
	'gemini-2.5-pro',
    'gemini-3-flash-preview',
    'gemini-3.1-pro-preview',
];

// X(Twitter) のカード画像は、URL先のHTMLにあるOG metaを読みます。
// milestoneごとのOG画像(assets/og/*.png)を用意したIDだけ、/share/{id}.html を用意してください。
// ここに入っていないIDは share URL を使わず、通常のページURLを投稿します。
export const MILESTONE_SHARE_PAGE_IDS = ['rookie', 'beginner', 'architect', 'solution_architect', 'senior_architect'];

// OpenAI models – tried in order, similar to Gemini candidates.
// GPT-5 mini is affordable and suitable for 13–17 users who cannot use Google AI Studio.
export const OPENAI_MODEL_CANDIDATES = [
	'gpt-5-mini',
	'gpt-5',
];
