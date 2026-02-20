// 公開（UIで選択可能）にする試験IDをここで制御します。
// まずは ANS と CLF を公開（切り替え動作確認用）。
export const PUBLIC_EXAM_IDS = ['ans-c01'];

export const DEFAULT_EXAM_ID = 'ans-c01';

// Gemini models change over time; keep a small fallback list.
// The app will try these in order when calling the API.
export const GEMINI_MODEL_CANDIDATES = [
	// Prefer latest preview first (Google may change availability over time)
	'gemini-2.5-flash',

	// Fallbacks
	'gemini-2.5-pro',
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
    'gemini-3.1-pro-preview',
];

// X(Twitter) のカード画像は、URL先のHTMLにあるOG metaを読みます。
// milestoneごとのOG画像(assets/og/*.png)を用意したIDだけ、/share/{id}.html を用意してください。
// ここに入っていないIDは share URL を使わず、通常のページURLを投稿します。
export const MILESTONE_SHARE_PAGE_IDS = ['rookie', 'beginner', 'architect', 'solution_architect', 'senior_architect'];
