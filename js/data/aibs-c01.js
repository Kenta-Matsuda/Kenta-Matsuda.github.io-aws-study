/*
 * AWS Certified AI Business Strategist (AIBS-C01)
 *
 * ⚠️ PLACEHOLDER DOMAINS - HUMAN VERIFICATION REQUIRED
 * ----------------------------------------------------
 * At authoring time the AWS domains (aws.amazon.com, docs.aws.amazon.com,
 * d1.awsstatic.com) were network-blocked, so the exam-specific domain
 * breakdown (domain names, weights, and service lists) COULD NOT be fetched
 * or verified against the official exam guide. To avoid hallucinated content,
 * the `domains` array below and the step-4 knowledge arrays contain only
 * clearly-labeled TODO placeholders. A human should fill in the accurate
 * domains/weights/tasks from the official exam guide:
 *   https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html
 *
 * The step scaffold (register / overview / official training / domain study /
 * practice) and the top-level official links come directly from the issue
 * body (#67) and the known-safe AWS Training & Skill Builder landing pages.
 * No PDF guide URL or Skill Builder course ID has been invented.
 */
export const AIBS_C01 = {
  id: 'aibs-c01',
  code: 'AIBS-C01',
  shortLabel: 'AIBS',
  title: 'AWS Certified AI Business Strategist',
  subtitle: '試験ガイド完全準拠の合格ナビゲーター',
  subtitleEn: 'Study Resource Navigator based on the Exam Guide',
  steps: [
    {
      id: '1',
      title: 'Register for the exam',
      jpTitle: '試験の申し込み',
      description: [
        'AWS認定試験の受験登録を行います。試験はPearson VUEを通じてオンラインまたはテストセンターで受験できます。',
      ],
      descriptionEn: [
        'Register for the AWS certification exam. You can take the exam online or at a test center through Pearson VUE.',
      ],
      resources: [
        {
          key: 'official-page',
          label: '試験の公式ページ',
          labelEn: 'Official Exam Page',
          iconClass: 'fas fa-file-alt',
          iconColorClass: 'text-blue-500',
          items: [
            {
              title: 'AWS Certified AI Business Strategist 公式ページ',
              titleEn: 'AWS Certified AI Business Strategist Official Page',
              url: 'https://aws.amazon.com/jp/certification/certified-ai-business-strategist/',
              urlEn: 'https://aws.amazon.com/certification/certified-ai-business-strategist/',
              note: '試験概要・合格条件・出題範囲などの公式情報',
              noteEn: 'Official information on exam overview, passing criteria, and scope',
              recommend: true,
            },
          ],
        },
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
              url: 'https://www.aws.training/certification',
              note: 'AWS認定試験の受験登録はこちらから（公式の申し込みサイト）',
              noteEn: 'Register for the AWS certification exam here (official registration site)',
              recommend: true,
            },
          ],
        },
      ],
    },
    {
      id: '2',
      title: 'Understand the exam overview',
      jpTitle: '試験の概要を把握する',
      description: [
        '試験ガイドを読み、出題範囲・配点比率・問題形式を理解します。学習の全体像を掴んでから各ドメインに進みましょう。',
      ],
      descriptionEn: [
        'Read the Exam Guide to understand the exam scope, scoring weights, and question formats. Grasp the big picture before diving into each domain.',
      ],
      resources: [
        {
          key: 'guide',
          label: '試験ガイド',
          labelEn: 'Exam Guide',
          iconClass: 'fas fa-graduation-cap',
          iconColorClass: 'text-orange-500',
          items: [
            {
              title: 'AWS Certified AI Business Strategist 試験ガイド（試験詳細）',
              titleEn: 'AWS Certified AI Business Strategist Exam Guide (Exam Details)',
              url: 'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html',
              urlEn: 'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html',
              note: '試験範囲・出題比率・問題形式を確認',
              noteEn: 'Review exam scope, question ratios, and question formats',
              recommend: true,
            },
          ],
        },
      ],
    },
    {
      id: '3',
      title: 'Learn with official training courses',
      jpTitle: '公式トレーニングで基礎を固める',
      description: [
        'AWS Skill Builder のコースで、試験対象分野の基礎知識をインプットします。試験対策に特化したコースが公開されている場合があります。',
      ],
      descriptionEn: [
        'Build foundational knowledge for the exam scope with courses on AWS Skill Builder. Exam-specific preparation courses may also be available.',
      ],
      resources: [
        {
          key: 'training',
          label: 'AWS トレーニング',
          labelEn: 'AWS Training',
          iconClass: 'fas fa-chalkboard-teacher',
          iconColorClass: 'text-green-600',
          items: [
            {
              title: 'AWS Skill Builder',
              titleEn: 'AWS Skill Builder',
              url: 'https://skillbuilder.aws/',
              note: 'AWS Skill Builder: 公式トレーニングコース（試験対策コースを検索して受講）',
              noteEn: 'AWS Skill Builder: Official training courses (search for exam-prep courses)',
              recommend: true,
            },
          ],
        },
      ],
    },
    {
      id: '4',
      title: 'Deep dive into each domain',
      jpTitle: 'ドメイン別の学習を進める',
      description: [
        'このアプリの Domain タブに切り替えて、各ドメインのタスクごとに用意されたリソースを読み進めましょう。',
        'AI 解説や AI 模擬問題も活用して、理解を深めることができます。',
        '※ 現在のドメイン情報は公式試験ガイドの取得待ちのプレースホルダーです。正確なドメイン・配点は公式試験ガイドで確認してください。',
      ],
      descriptionEn: [
        'Switch to the Domain tabs in this app and study the resources prepared for each domain task.',
        'You can also use AI explanations and AI practice questions to deepen your understanding.',
        'NOTE: The current domain information is a placeholder pending retrieval of the official exam guide. Verify the accurate domains and weights against the official exam guide.',
      ],
      knowledge: [
        'TODO: 公式試験ガイドに基づき各ドメインの知識項目を追加',
      ],
      knowledgeEn: [
        'TODO: Add knowledge items for each domain per the official exam guide',
      ],
      resources: [
        {
          key: 'blackbelts',
          label: 'AWS Black Belt Online Seminar',
          labelEn: 'AWS Black Belt Online Seminar',
          iconClass: 'fas fa-video',
          iconColorClass: 'text-red-500',
          items: [
            {
              title: 'AWS Black Belt Online Seminar 資料一覧',
              titleEn: 'AWS Black Belt Online Seminar Materials',
              url: 'https://aws.amazon.com/jp/blogs/news/aws-blackbelt-overview/',
              urlEn: 'https://aws.amazon.com/jp/blogs/news/aws-blackbelt-overview/',
              note: 'サービス別の解説スライド・動画のアーカイブ一覧',
              noteEn: 'Archive of service-by-service slides and videos',
              recommend: true,
            },
          ],
        },
        {
          key: 'docs',
          label: '公式ドキュメント',
          labelEn: 'Official Documentation',
          iconClass: 'fas fa-book-open',
          iconColorClass: 'text-blue-600',
          items: [
            {
              title: 'AWS の AI/ML サービス',
              titleEn: 'AWS AI/ML Services',
              url: 'https://aws.amazon.com/jp/machine-learning/',
              urlEn: 'https://aws.amazon.com/machine-learning/',
              note: 'AI/ML サービスの全体像',
              noteEn: 'Overview of AI/ML services',
              recommend: true,
            },
            {
              title: 'AWS ドキュメント',
              titleEn: 'AWS Documentation',
              url: 'https://docs.aws.amazon.com/ja_jp/',
              urlEn: 'https://docs.aws.amazon.com/',
              note: '各 AWS サービスの公式ドキュメントハブ',
              noteEn: 'Official documentation hub for each AWS service',
            },
          ],
        },
        {
          key: 'guide',
          label: '試験ガイド',
          labelEn: 'Exam Guide',
          iconClass: 'fas fa-file-alt',
          iconColorClass: 'text-gray-600',
          items: [
            {
              title: 'AWS Certified AI Business Strategist 試験ガイド（試験詳細）',
              titleEn: 'AWS Certified AI Business Strategist Exam Guide (Exam Details)',
              url: 'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html',
              urlEn: 'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html',
              note: 'ドメインごとの出題範囲を公式ガイドで確認',
              noteEn: 'Review the scope of each domain in the official guide',
              recommend: true,
            },
          ],
        },
      ],
    },
    {
      id: '5',
      title: 'Practice with sample questions',
      jpTitle: '模擬問題で実力を確認する',
      description: [
        '公式の練習問題で本番に近い問題を解き、理解度をチェックします。苦手なドメインが見つかったら、ドメイン別タブに戻って復習しましょう。',
      ],
      descriptionEn: [
        'Solve exam-like questions from the official practice material to check your understanding. If you find weak domains, go back to the domain tabs to review.',
      ],
      resources: [
        {
          key: 'practice',
          label: '練習問題',
          labelEn: 'Practice Questions',
          iconClass: 'fas fa-tasks',
          iconColorClass: 'text-purple-500',
          items: [
            {
              title: 'AWS Skill Builder（練習問題を検索）',
              titleEn: 'AWS Skill Builder (Search for Practice Questions)',
              url: 'https://skillbuilder.aws/',
              note: 'AWS Skill Builder: 公式練習問題集を検索して利用',
              noteEn: 'AWS Skill Builder: Search for and use the official practice question set',
              recommend: true,
            },
          ],
        },
      ],
    },
  ],
  domains: [
    // ⚠️ PLACEHOLDER: The official exam guide was network-blocked at authoring
    // time, so real domain names/weights/tasks could not be verified. Replace
    // this entry with the accurate domains from the official exam guide.
    {
      id: 1,
      title: 'TODO: Add domains per the official exam guide',
      jpTitle: 'TODO: 試験ガイドに基づきドメインを追加',
      weight: 0,
      color: '#3b82f6',
      description: 'このドメイン情報は公式試験ガイドの取得待ちのプレースホルダーです。正確なドメイン名・配点・タスクは公式試験ガイドで確認して置き換えてください。',
      descriptionEn: 'This domain information is a placeholder pending retrieval of the official exam guide. Replace it with accurate domain names, weights, and tasks from the official exam guide.',
      tasks: [
        {
          id: '1.1',
          title: 'TODO: Add tasks per the official exam guide',
          jpTitle: 'TODO: 試験ガイドに基づきタスクを追加',
          description: [
            'タスク（プレースホルダー）: 公式試験ガイドに基づきタスクとスキルを追加してください。',
          ],
          descriptionEn: [
            'Task (placeholder): Add tasks and skills per the official exam guide.',
          ],
          knowledge: [
            'TODO: 公式試験ガイドに基づき知識項目を追加',
          ],
          knowledgeEn: [
            'TODO: Add knowledge items per the official exam guide',
          ],
          resources: [
            {
              key: 'guide',
              label: '試験ガイド',
              labelEn: 'Exam Guide',
              iconClass: 'fas fa-file-alt',
              iconColorClass: 'text-gray-600',
              items: [
                {
                  title: 'AWS Certified AI Business Strategist 試験ガイド（試験詳細）',
                  titleEn: 'AWS Certified AI Business Strategist Exam Guide (Exam Details)',
                  url: 'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html',
                  urlEn: 'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html',
                  note: '公式ガイドでドメインの詳細を確認',
                  noteEn: 'Review domain details in the official guide',
                  recommend: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
