/**
 * Common learning steps that apply across ALL AWS certification exams.
 * These are displayed separately from exam-specific roadmap steps.
 */
export const COMMON_STEPS = [
  {
    id: 'register',
    title: 'Register for the exam',
    jpTitle: '試験の申し込み',
    description: [
      'AWS認定試験の受験登録を行います。試験はPearson VUEを通じてオンラインまたはテストセンターで受験できます。',
      '初めて受験する方へ：申し込みサイトが英語表記だったり手順が分かりにくい場合があります。下記の「初めての試験申し込みガイド」を参考に、落ち着いて進めましょう。',
    ],
    descriptionEn: [
      'Register for the AWS certification exam. You can take the exam online or at a test center through Pearson VUE.',
      'For first-time test takers: The registration process may seem complex. Refer to the guides below for step-by-step instructions.',
    ],
    knowledge: [
      'AWS Training & Certification でアカウントを作成（または既存のAmazonアカウントでサインイン）',
      '試験言語・受験方法（テストセンター or オンライン）を選択',
      '受験料の支払い（クレジットカード）を完了',
      'オンライン受験の場合はシステムテストを事前に実施しておくと安心',
    ],
    knowledgeEn: [
      'Create an AWS Training & Certification account (or sign in with an existing Amazon account)',
      'Select exam language and delivery method (test center or online)',
      'Complete payment (credit card)',
      'For online exams, run the system test in advance',
    ],
    resources: [
      {
        key: 'registration',
        label: '試験の申し込み',
        labelEn: 'Exam Registration',
        iconClass: 'fas fa-clipboard-check',
        iconColorClass: 'text-indigo-500',
        items: [
          {
            title: 'AWS Training & Certification（試験申し込み）',
            titleEn: 'AWS Training & Certification (Exam Registration)',
            url: 'https://www.aws.training/certification?p=cert&c=ai&z=1',
            note: 'AWS認定試験の受験登録はこちらから（公式の申し込みサイト）',
            noteEn: 'Register for the AWS certification exam here (official registration site)',
            recommend: true,
          },
        ],
      },
      {
        key: 'beginner-guide',
        label: '初めての試験申し込みガイド',
        labelEn: 'First-Time Registration Guide',
        iconClass: 'fas fa-hand-holding-heart',
        iconColorClass: 'text-pink-500',
        items: [
          {
            title: '【YouTube】AWS認定試験の申し込み手順（日本語解説）',
            titleEn: 'AWS Certification Exam Registration Steps (Video)',
            url: 'https://www.youtube.com/results?search_query=AWS%E8%AA%8D%E5%AE%9A%E8%A9%A6%E9%A8%93+%E7%94%B3%E3%81%97%E8%BE%BC%E3%81%BF+%E6%89%8B%E9%A0%86',
            urlEn: 'https://www.youtube.com/results?search_query=AWS+certification+exam+registration+guide',
            note: 'YouTube で申し込み手順を動画で確認できます',
            noteEn: 'Watch registration steps on YouTube',
            recommend: true,
          },
          {
            title: 'AWS認定試験の予約方法（公式ポリシーページ）',
            titleEn: 'How to Schedule an AWS Certification Exam (Official Policy)',
            url: 'https://aws.amazon.com/jp/certification/policies/before-testing/',
            urlEn: 'https://aws.amazon.com/certification/policies/before-testing/',
            note: 'アカウント作成から予約完了までの手順を公式が解説',
            noteEn: 'Official guide from account creation to booking completion',
          },
        ],
      },
    ],
  },
  {
    id: 'domain-study',
    title: 'Deep dive into each domain',
    jpTitle: 'ドメイン別の学習を進める',
    description: [
      'このアプリのドメイン別タブに切り替えて、各ドメインのタスクごとに用意されたブログ・Black Belt・公式ドキュメントを読み進めましょう。',
      '「解説」ボタンでAIに重要ポイントを質問でき、「模擬問題」ボタンで練習問題も生成できます。',
    ],
    descriptionEn: [
      'Switch to the domain tabs in this app and work through the blogs, Black Belt presentations, and official documentation prepared for each task.',
      'Use the "Explain" button to ask AI about key points, and the "Quiz" button to generate practice questions.',
    ],
    knowledge: [
      '各ドメインの出題比率を把握し、比率の高いドメインから着手',
      'タスクごとにリソースを消化し、理解度をAIクイズで確認',
      '苦手なドメインは繰り返し学習する',
    ],
    knowledgeEn: [
      'Understand domain weights and start with the highest-weighted domain',
      'Work through resources for each task and verify understanding with AI quizzes',
      'Revisit domains where you score lower',
    ],
    resources: [
      {
        key: 'aws-general',
        label: 'AWS全般の学習リソース',
        labelEn: 'General AWS Learning Resources',
        iconClass: 'fas fa-book-open',
        iconColorClass: 'text-blue-500',
        items: [
          {
            title: 'AWS ドキュメント',
            titleEn: 'AWS Documentation',
            url: 'https://docs.aws.amazon.com/',
            note: 'サービスごとの公式ドキュメント',
            noteEn: 'Official documentation for each service',
            recommend: true,
          },
          {
            title: 'AWS Black Belt Online Seminar',
            titleEn: 'AWS Black Belt Online Seminar',
            url: 'https://aws.amazon.com/jp/events/aws-event-resource/archive/?cards.sort-by=item.additionalFields.startDateTime&cards.sort-order=desc&awsf.tech-category=*all',
            note: 'AWS サービスを深掘りするセミナー資料集',
            noteEn: 'Deep-dive seminar materials for AWS services',
            recommend: true,
          },
          {
            title: 'AWS Well-Architected Framework',
            titleEn: 'AWS Well-Architected Framework',
            url: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html',
            note: 'アーキテクチャ設計のベストプラクティス',
            noteEn: 'Best practices for architecture design',
          },
        ],
      },
    ],
  },
  {
    id: 'practice',
    title: 'Practice with sample questions',
    jpTitle: '模擬問題で実力を確認する',
    description: [
      '公式の練習問題集で本番に近い問題を解き、理解度をチェックします。苦手なドメインが見つかったら、ドメイン別タブに戻って復習しましょう。',
      'このアプリのAIクイズ機能でも練習できます。ダッシュボードの「クイズチャレンジ」から全ドメイン横断の模擬試験に挑戦しましょう。',
    ],
    descriptionEn: [
      'Solve official practice questions to check your understanding. If you find weak domains, go back to the domain tabs to review.',
      'You can also practice with the AI quiz feature in this app. Try the cross-domain practice exam from the "Quiz Challenge" on the dashboard.',
    ],
    knowledge: [
      '公式の練習問題セット（Official Practice Question Set）を解く',
      '正答率が低いドメインを重点復習する',
      'このアプリの「本番模擬試験」モードで時間配分も練習する',
    ],
    knowledgeEn: [
      'Work through the Official Practice Question Set',
      'Focus review on domains with low accuracy',
      'Practice time management with this app\'s "Practice Exam" mode',
    ],
    resources: [
      {
        key: 'practice-resources',
        label: '共通の模擬試験リソース',
        labelEn: 'Common Practice Resources',
        iconClass: 'fas fa-pen-to-square',
        iconColorClass: 'text-purple-500',
        items: [
          {
            title: 'AWS Skill Builder（公式練習問題）',
            titleEn: 'AWS Skill Builder (Official Practice Questions)',
            url: 'https://skillbuilder.aws/',
            note: '各試験の公式練習問題セットが利用可能',
            noteEn: 'Official practice question sets available for each exam',
            recommend: true,
          },
          {
            title: 'AWS 認定試験の準備ページ',
            titleEn: 'AWS Certification Preparation Page',
            url: 'https://aws.amazon.com/jp/certification/certification-prep/',
            urlEn: 'https://aws.amazon.com/certification/certification-prep/',
            note: '試験ごとの準備ガイド・推奨学習パス',
            noteEn: 'Preparation guide and recommended learning path for each exam',
          },
        ],
      },
    ],
  },
];

/**
 * IDs of steps considered "common" across exams.
 * Used to filter out common steps from individual exam roadmaps.
 */
export const COMMON_STEP_IDS = new Set(['1']);

/**
 * Check if a step title (English) matches a common pattern.
 * Steps with these exact English titles are considered common and will be
 * shown in the "Common Resources" section instead of the exam roadmap.
 */
export const COMMON_STEP_TITLES = new Set([
  'Register for the exam',
]);
