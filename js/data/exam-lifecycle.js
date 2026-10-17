/**
 * exam-lifecycle.js — 試験バージョンの改定・廃止スケジュール（AWS 公式発表ベース）。
 *
 * AWS 認定は数年おきに新バージョンへ改定され（例: SAP-C02 → SAP-C03）、後継なしで
 * 廃止される試験もある（例: ANS-C01）。各試験の学習データ（js/data/<exam>.js）は
 * 「現在受験できるバージョン」の試験ガイドに準拠させ、改定・廃止の予定はこのファイルに
 * まとめる。js/examLifecycle.js がこれを読み、選択中の試験のお知らせバナー、
 * サイドバーのバッジ、AI チャットの前提情報として表示する。
 *
 * - 日付は AWS が公表した暦日（YYYY-MM-DD）。閲覧者の端末のローカル日付で判定する。
 * - phases は日付で切り替わる表示内容。`from` / `until` は両端を含み、隙間なく並べる。
 *   日付が過ぎると次のフェーズの文言へ自動で切り替わるため、移行日にコード変更は要らない。
 * - status は 'updating'（改定予定）/ 'superseded'（新バージョンへ移行済み）/
 *   'retiring'（廃止予定）/ 'retired'（廃止済み）。バッジとバナー見出しの i18n キー
 *   （examLifecycle.badge.* / examLifecycle.title.*）に対応する。
 * - sources は AWS 公式の一次情報。`url`（日本語）/ `urlEn`（英語）を対で保守する。
 *   scripts/check-resource-links.mjs の走査対象にも入る。
 *
 * 新バージョンの試験ガイドが公開され、旧バージョンの受験期間が終わったら、新バージョンの
 * 学習データを js/data/ に追加して試験 ID を切り替え、ここから該当エントリを削除する
 * （手順は docs/issues/exam-version-lifecycle.md）。
 */

const SEPTEMBER_2026_UPDATES = {
  title: 'AWS 認定資格 (MLA、SAP、DVA) に関するアップデート: 2026 年 9 月（AWS ブログ）',
  titleEn: 'Certification updates from AWS Training and Certification: September 2026 (AWS Blog)',
  url: 'https://aws.amazon.com/jp/blogs/news/september-2026-new-offerings/',
  urlEn: 'https://aws.amazon.com/blogs/training-and-certification/september-2026-new-offerings/',
};

export const EXAM_LIFECYCLE = {
  'mla-c01': {
    successorCode: 'MLA-C02',
    verifiedAt: '2026-10-16',
    phases: [
      {
        until: '2027-01-13',
        status: 'updating',
        message:
          '英語の MLA-C01 は 2026年9月28日で受験を終了し、2026年9月29日から MLA-C02 のベータ試験（英語のみ）が始まっています。日本語・韓国語・簡体字中国語の MLA-C01 は、MLA-C02 の一般提供開始（2027年1月14日予定）まで受験できます。このページの学習内容は MLA-C01 の試験ガイドに準拠しています。',
        messageEn:
          'The English version of MLA-C01 closed on September 28, 2026, and the MLA-C02 beta exam (English only) has been available since September 29, 2026. MLA-C01 remains available in Japanese, Korean, and Simplified Chinese until MLA-C02 becomes generally available (scheduled for January 14, 2027). The study content on this page follows the MLA-C01 exam guide.',
      },
      {
        from: '2027-01-14',
        status: 'superseded',
        message:
          'AWS の発表では、2027年1月14日に MLA-C02 が全言語で一般提供され、MLA-C01 は全言語で廃止されます。このページの学習内容は MLA-C01 の試験ガイドに準拠しているため、受験前に MLA-C02 の試験ガイドで出題範囲の変更点を確認してください。',
        messageEn:
          'According to AWS, MLA-C02 becomes generally available in all languages on January 14, 2027, and MLA-C01 is retired in all languages. The study content on this page follows the MLA-C01 exam guide, so check the MLA-C02 exam guide for changes in scope before your exam.',
      },
    ],
    sources: [
      {
        title: 'MLA-C02 への更新のお知らせ（AWS ブログ）',
        titleEn: 'Updates to AWS Certified Machine Learning Engineer - Associate (MLA-C02) (AWS Blog)',
        url: 'https://aws.amazon.com/jp/blogs/news/updates-to-aws-certified-machine-learning-engineer-associate-mla-c02/',
        urlEn: 'https://aws.amazon.com/blogs/training-and-certification/updates-to-aws-certified-machine-learning-engineer-associate-mla-c02/',
      },
      {
        title: 'AWS Certified Machine Learning Engineer - Associate (MLA-C02) 試験ガイド',
        titleEn: 'AWS Certified Machine Learning Engineer - Associate (MLA-C02) Exam Guide',
        url: 'https://docs.aws.amazon.com/ja_jp/aws-certification/latest/machine-learning-engineer-associate-02/machine-learning-engineer-associate-02.html',
        urlEn: 'https://docs.aws.amazon.com/aws-certification/latest/machine-learning-engineer-associate-02/machine-learning-engineer-associate-02.html',
      },
      {
        title: 'MLA-C01 と MLA-C02 の比較（英語）',
        titleEn: 'Comparison of MLA-C01 and MLA-C02',
        url: 'https://docs.aws.amazon.com/aws-certification/latest/machine-learning-engineer-associate-02/mla-02-comparison.html',
        urlEn: 'https://docs.aws.amazon.com/aws-certification/latest/machine-learning-engineer-associate-02/mla-02-comparison.html',
      },
    ],
  },

  'sap-c02': {
    successorCode: 'SAP-C03',
    verifiedAt: '2026-10-16',
    phases: [
      {
        until: '2026-11-16',
        status: 'updating',
        message:
          'SAP-C02 の受験は 2026年11月16日までです。後継の SAP-C03 は 2026年11月17日から受験でき、受験登録は 2026年10月27日に始まります。このページの学習内容は現行の SAP-C02 の試験ガイドに準拠しています。',
        messageEn:
          'SAP-C02 can be taken through November 16, 2026. Its successor, SAP-C03, is available from November 17, 2026, with registration opening on October 27, 2026. The study content on this page follows the current SAP-C02 exam guide.',
      },
      {
        from: '2026-11-17',
        status: 'superseded',
        message:
          'SAP-C02 の受験は 2026年11月16日で終了し、2026年11月17日から SAP-C03 が提供されています。このページの学習内容は SAP-C02 の試験ガイドに準拠しているため、受験前に SAP-C03 の試験ガイドで出題範囲を確認してください。',
        messageEn:
          'SAP-C02 closed on November 16, 2026, and SAP-C03 has been available since November 17, 2026. The study content on this page follows the SAP-C02 exam guide, so check the SAP-C03 exam guide for the current scope before your exam.',
      },
    ],
    sources: [
      SEPTEMBER_2026_UPDATES,
      {
        title: 'AWS Certified Solutions Architect - Professional 公式ページ',
        titleEn: 'AWS Certified Solutions Architect - Professional Official Page',
        url: 'https://aws.amazon.com/jp/certification/certified-solutions-architect-professional/',
        urlEn: 'https://aws.amazon.com/certification/certified-solutions-architect-professional/',
      },
    ],
  },

  'dva-c02': {
    successorCode: 'DVA-C03',
    verifiedAt: '2026-10-16',
    phases: [
      {
        until: '2026-11-30',
        status: 'updating',
        message:
          'DVA-C02 の受験は 2026年11月30日までです。後継の DVA-C03 は 2026年12月1日から受験でき、受験登録は 2026年10月27日に始まります。このページの学習内容は現行の DVA-C02 の試験ガイドに準拠しています。',
        messageEn:
          'DVA-C02 can be taken through November 30, 2026. Its successor, DVA-C03, is available from December 1, 2026, with registration opening on October 27, 2026. The study content on this page follows the current DVA-C02 exam guide.',
      },
      {
        from: '2026-12-01',
        status: 'superseded',
        message:
          'DVA-C02 の受験は 2026年11月30日で終了し、2026年12月1日から DVA-C03 が提供されています。このページの学習内容は DVA-C02 の試験ガイドに準拠しているため、受験前に DVA-C03 の試験ガイドで出題範囲を確認してください。',
        messageEn:
          'DVA-C02 closed on November 30, 2026, and DVA-C03 has been available since December 1, 2026. The study content on this page follows the DVA-C02 exam guide, so check the DVA-C03 exam guide for the current scope before your exam.',
      },
    ],
    sources: [
      SEPTEMBER_2026_UPDATES,
      {
        title: 'AWS Certified Developer - Associate 公式ページ',
        titleEn: 'AWS Certified Developer - Associate Official Page',
        url: 'https://aws.amazon.com/jp/certification/certified-developer-associate/',
        urlEn: 'https://aws.amazon.com/certification/certified-developer-associate/',
      },
    ],
  },

  'ans-c01': {
    successorCode: null,
    verifiedAt: '2026-10-16',
    phases: [
      {
        until: '2026-12-31',
        status: 'retiring',
        message:
          'ANS-C01 は廃止が予定されており、受験できるのは 2026年12月31日までです（後継の試験はありません）。廃止前に取得した認定は、通常どおり 3 年間有効です。',
        messageEn:
          'The last day to take ANS-C01 is December 31, 2026, and there is no successor exam. Certifications earned before the retirement remain active for the standard three-year period.',
      },
      {
        from: '2027-01-01',
        status: 'retired',
        message:
          'ANS-C01 は 2026年12月31日をもって廃止され、新たに受験・取得することはできません。取得済みの認定は有効期限まで有効です。このページはネットワーク分野の学習資料として引き続き利用できます。',
        messageEn:
          'ANS-C01 was retired after December 31, 2026, and can no longer be taken or earned. Certifications already earned stay active until they expire. This page remains available as a networking study resource.',
      },
    ],
    sources: [
      {
        title: 'AWS Certified Advanced Networking - Specialty 公式ページ',
        titleEn: 'AWS Certified Advanced Networking - Specialty Official Page',
        url: 'https://aws.amazon.com/jp/certification/certified-advanced-networking-specialty/',
        urlEn: 'https://aws.amazon.com/certification/certified-advanced-networking-specialty/',
      },
    ],
  },
};
