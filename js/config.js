// 公開（UIで選択可能）にする試験IDをここで制御します。
// まずは ANS と CLF を公開（切り替え動作確認用）。
export const PUBLIC_EXAM_IDS = ['ans-c01'];

export const DEFAULT_EXAM_ID = 'ans-c01';

// 学習リソース欄の「セクション定義」。
// - data 側の task には `blogs`, `blackbelts`, `guides` など任意のキーで
//   `[{ title, url, note? }, ...]` を置けます（task.resources の中でもOK）。
// - ここで「表示名」「アイコン（任意）」「色」「並び順」「抽出ルール」を設定できます。
// - AWSに限らず汎用サイトとして使えるよう、ここを編集すればUI表示が変わります。
export const RESOURCE_SECTION_CONFIG = {
	order: ['blogs', 'blackbelts', 'guides'],

	// 既知キーの表示定義
	sections: {
		blogs: {
			label: 'ブログ',
			iconClass: 'fas fa-book',
			iconColorClass: 'text-orange-500',
			// 通常は同名キーから収集（例: task.resources のセクション key='blogs' / task.resources.blogs）
			sources: ['blogs'],
			// 例: docs 系をガイドに回す場合はここで除外
			excludePatterns: ['docs\\.aws\\.amazon\\.com/'],
		},
		blackbelts: {
			label: 'セミナー/講座',
			iconClass: 'fas fa-graduation-cap',
			iconColorClass: 'text-purple-500',
			sources: ['blackbelts'],
		},
		guides: {
			label: '開発者ガイド',
			iconClass: 'fas fa-book-open',
			iconColorClass: 'text-blue-600',
			sources: ['guides', 'docs'],
			// 例: 互換性のため blogs に混在する docs をここへ吸い上げ
			pickFrom: [
				{
					key: 'blogs',
					includePatterns: ['docs\\.aws\\.amazon\\.com/'],
				},
			],
		},
	},

	// 未定義キーも表示したい場合 true（例: task.workshops, task.whitepapers など）
	showUnknownKeys: true,

	// 未定義キーのデフォルト見た目
	unknownDefaults: {
		iconClass: '',
		iconColorClass: 'text-gray-600',
	},
};
