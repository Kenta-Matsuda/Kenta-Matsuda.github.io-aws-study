export const AIF_C01 = {
  id: 'aif-c01',
  code: 'AIF-C01',
  shortLabel: 'AIF',
  title: 'AWS Certified AI Practitioner',
  subtitle: '試験ガイド完全準拠の合格ナビゲーター',
  steps: [
    {
      id: '1',
      title: 'Register for the exam',
      jpTitle: '試験の申し込み',
      description: [
        'AWS認定試験の受験登録を行います。試験はPearson VUEを通じてオンラインまたはテストセンターで受験できます。',
      ],
      resources: [
        {
          key: 'registration',
          label: '申し込み・受験情報',
          iconClass: 'fas fa-clipboard-check',
          iconColorClass: 'text-indigo-500',
          items: [
            {
              title: 'AWS Certification 公式ページ（受験申し込み）',
              url: 'https://aws.amazon.com/jp/certification/certified-ai-practitioner/',
              note: '試験概要・申し込み・合格条件',
              recommend: true,
            },
            {
              title: 'Pearson VUE - AWS 試験予約',
              url: 'https://www.pearsonvue.co.jp/Clients/Amazon-Web-Services.aspx',
              note: '試験日程・会場の予約サイト',
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
        '試験ガイド（PDF）を読み、出題範囲・配点比率・問題形式を理解します。学習の全体像を掴んでから各ドメインに進みましょう。',
      ],
      resources: [
        {
          key: 'guide',
          label: '試験ガイド',
          iconClass: 'fas fa-graduation-cap',
          iconColorClass: 'text-orange-500',
          items: [
            {
              title: 'AWS Certified AI Practitioner 試験ガイド (PDF)',
              url: 'https://d1.awsstatic.com/ja_JP/training-and-certification/docs-ai-practitioner/AWS-Certified-AI-Practitioner_Exam-Guide.pdf',
              note: '試験範囲・出題比率・サンプル問題を確認',
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
        'AWS Skill Builder の無料コースで、AI/ML の基礎知識をインプットします。試験対策に特化したコースもあります。',
      ],
      resources: [
        {
          key: 'training',
          label: 'AWS トレーニング',
          iconClass: 'fas fa-chalkboard-teacher',
          iconColorClass: 'text-green-600',
          items: [
            {
              title: 'Exam Prep Standard Course: AWS Certified AI Practitioner',
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/19554/exam-prep-standard-course-aws-certified-ai-practitioner-aif-c01',
              note: 'AWS Skill Builder: 試験対策コース（無料）',
              recommend: true,
            },
            {
              title: 'AWS AI Practitioner Essentials',
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/19559/aws-ai-practitioner-essentials',
              note: 'AWS Skill Builder: AI基礎コース（無料）',
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
        'このアプリの Domain 1〜5 タブに切り替えて、各ドメインのタスクごとに用意されたブログ・Black Belt・公式ドキュメントを読み進めましょう。',
        'AI 解説や AI 模擬問題も活用して、理解を深めることができます。',
      ],
      knowledge: [
        'Domain 1: AI と ML の基礎（20%）',
        'Domain 2: 生成 AI の基礎（24%）',
        'Domain 3: 基盤モデルの応用（28%）',
        'Domain 4: 責任ある AI のガイドライン（14%）',
        'Domain 5: AI ソリューションのセキュリティ、コンプライアンス、ガバナンス（14%）',
      ],
      resources: [
        {
          key: 'whitepapers',
          label: 'ホワイトペーパー・ガイド',
          iconClass: 'fas fa-file-alt',
          iconColorClass: 'text-gray-600',
          items: [
            {
              title: 'AWS での機械学習',
              url: 'https://aws.amazon.com/jp/machine-learning/',
              note: 'AWS の AI/ML サービス概要',
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
        '公式の練習問題集で本番に近い問題を解き、理解度をチェックします。苦手なドメインが見つかったら、ドメイン別タブに戻って復習しましょう。',
      ],
      resources: [
        {
          key: 'practice',
          label: '練習問題',
          iconClass: 'fas fa-tasks',
          iconColorClass: 'text-purple-500',
          items: [
            {
              title: 'AWS Certification 公式練習問題集',
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/19790/aws-certified-ai-practitioner-official-practice-question-set-aif-c01-english',
              note: 'AWS Skill Builder: 無料',
              recommend: true,
            },
          ],
        },
      ],
    },
    {
      id: '6',
      title: 'Use AI features to boost learning',
      jpTitle: 'AI機能を活用する',
      description: [
        'このアプリのAI機能（用語解説・模擬問題生成）を使って、弱点の補強や知識の定着を図りましょう。',
        'AI機能を使用するには、右上の設定ボタン（⚙️）からAPIキーを設定してください。Gemini（無料）または OpenAI に対応しています。',
      ],
      resources: [
        {
          key: 'ai-setup',
          label: 'APIキー取得',
          iconClass: 'fas fa-key',
          iconColorClass: 'text-amber-500',
          items: [
            {
              title: 'Google AI Studio（Gemini APIキー取得）',
              url: 'https://aistudio.google.com/app/apikey',
              note: '無料で取得可能（18歳以上）',
              recommend: true,
            },
            {
              title: 'OpenAI Platform（APIキー取得）',
              url: 'https://platform.openai.com/api-keys',
              note: '有料 — 13〜17歳の方はこちら',
            },
          ],
        },
      ],
    },
  ],
  domains: [
    {
      id: 1,
      title: 'Fundamentals of AI and ML',
      jpTitle: 'AI と ML の基礎',
      weight: 20,
      color: '#3b82f6',
      description: 'このドメインでは、AI/ML の基本概念、用語、ユースケース、および AWS の AI/ML サービスに関する知識が問われます。',
      tasks: [
        {
          id: '1.1',
          title: 'Explain basic AI concepts and terminologies.',
          jpTitle: 'AI の基本概念と用語を説明する。',
          description: [
            'タスクステートメント 1.1: AI の基本概念と用語を説明する。',
            '対象知識:',
            '- AI、ML、ディープラーニングの違い',
            '- 教師あり学習、教師なし学習、強化学習',
            '- 推論と学習の違い',
          ],
          knowledge: [
            'AI / ML / ディープラーニング',
            '教師あり学習',
            '教師なし学習',
            '強化学習',
            '推論（Inference）',
            'トレーニング（Training）',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS の AI/ML サービス',
                  url: 'https://aws.amazon.com/jp/machine-learning/',
                  note: 'AI/ML サービスの全体像',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '1.2',
          title: 'Identify practical use cases for AI.',
          jpTitle: 'AI の実践的なユースケースを特定する。',
          description: [
            'タスクステートメント 1.2: AI の実践的なユースケースを特定する。',
            '対象知識:',
            '- 自然言語処理（NLP）、コンピュータビジョン、レコメンデーション',
            '- 不正検出、予測分析',
          ],
          knowledge: [
            '自然言語処理（NLP）',
            'コンピュータビジョン',
            'レコメンデーションシステム',
            '不正検出',
            '予測分析',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS AI サービスのユースケース',
                  url: 'https://aws.amazon.com/jp/machine-learning/ai-services/',
                  note: 'AIサービスの活用事例',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '1.3',
          title: 'Describe the ML development lifecycle.',
          jpTitle: 'ML 開発ライフサイクルを説明する。',
          description: [
            'タスクステートメント 1.3: ML 開発ライフサイクルを説明する。',
            '対象知識:',
            '- データ収集・前処理・特徴量エンジニアリング',
            '- モデルの学習・評価・デプロイ',
            '- Amazon SageMaker の役割',
          ],
          knowledge: [
            'ML パイプライン',
            'データ前処理',
            '特徴量エンジニアリング',
            'モデル評価指標',
            'Amazon SageMaker',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon SageMaker',
                  url: 'https://aws.amazon.com/jp/sagemaker/',
                  note: 'ML プラットフォームの概要',
                  recommend: true,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 2,
      title: 'Fundamentals of Generative AI',
      jpTitle: '生成 AI の基礎',
      weight: 24,
      color: '#8b5cf6',
      description: 'このドメインでは、生成 AI の基本概念、基盤モデル、プロンプトエンジニアリング、および Amazon Bedrock に関する知識が問われます。',
      tasks: [
        {
          id: '2.1',
          title: 'Explain the basic concepts of generative AI.',
          jpTitle: '生成 AI の基本概念を説明する。',
          description: [
            'タスクステートメント 2.1: 生成 AI の基本概念を説明する。',
            '対象知識:',
            '- 生成 AI と従来の ML の違い',
            '- 基盤モデル（FM）、大規模言語モデル（LLM）',
            '- トランスフォーマーアーキテクチャの基礎',
          ],
          knowledge: [
            '生成 AI',
            '基盤モデル（Foundation Model）',
            '大規模言語モデル（LLM）',
            'トランスフォーマー',
            'トークン',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock',
                  url: 'https://aws.amazon.com/jp/bedrock/',
                  note: '生成 AI プラットフォームの概要',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '2.2',
          title: 'Understand generative AI model types and use cases.',
          jpTitle: '生成 AI モデルの種類とユースケースを理解する。',
          description: [
            'タスクステートメント 2.2: 生成 AI モデルの種類とユースケースを理解する。',
            '対象知識:',
            '- テキスト生成、画像生成、コード生成',
            '- 要約、翻訳、チャットボット',
          ],
          knowledge: [
            'テキスト生成',
            '画像生成',
            'コード生成',
            'チャットボット',
            '要約・翻訳',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock の基盤モデル',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/models-supported.html',
                  note: '利用可能なモデル一覧',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '2.3',
          title: 'Describe prompt engineering concepts and techniques.',
          jpTitle: 'プロンプトエンジニアリングの概念とテクニックを説明する。',
          description: [
            'タスクステートメント 2.3: プロンプトエンジニアリングの概念とテクニックを説明する。',
            '対象知識:',
            '- プロンプトの構成要素',
            '- ゼロショット、フューショット、Chain of Thought',
            '- プロンプトのベストプラクティス',
          ],
          knowledge: [
            'プロンプトエンジニアリング',
            'ゼロショット学習',
            'フューショット学習',
            'Chain of Thought',
            'Temperature / Top-P',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock プロンプトエンジニアリングガイドライン',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/prompt-engineering-guidelines.html',
                  note: 'プロンプト設計のベストプラクティス',
                  recommend: true,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 3,
      title: 'Applications of Foundation Models',
      jpTitle: '基盤モデルの応用',
      weight: 28,
      color: '#22c55e',
      description: 'このドメインでは、基盤モデルのファインチューニング、RAG、エージェント、および AWS サービスを使用した AI アプリケーションの構築に関する知識が問われます。',
      tasks: [
        {
          id: '3.1',
          title: 'Describe design considerations for foundation model applications.',
          jpTitle: '基盤モデルアプリケーションの設計上の考慮事項を説明する。',
          description: [
            'タスクステートメント 3.1: 基盤モデルアプリケーションの設計上の考慮事項を説明する。',
            '対象知識:',
            '- モデル選択の基準（コスト、レイテンシ、精度）',
            '- RAG（Retrieval-Augmented Generation）',
            '- ファインチューニング vs プロンプトエンジニアリング',
          ],
          knowledge: [
            'RAG（検索拡張生成）',
            'ファインチューニング',
            'Amazon Bedrock Knowledge Bases',
            'ベクトルデータベース',
            'エンベディング',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock Knowledge Bases',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/knowledge-base.html',
                  note: 'RAG の構築方法',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.2',
          title: 'Choose effective prompt engineering techniques.',
          jpTitle: '効果的なプロンプトエンジニアリング手法を選択する。',
          description: [
            'タスクステートメント 3.2: 効果的なプロンプトエンジニアリング手法を選択する。',
            '対象知識:',
            '- コンテキスト設定、制約条件の指定',
            '- 出力フォーマットの制御',
          ],
          knowledge: [
            'システムプロンプト',
            'コンテキストウィンドウ',
            '出力フォーマット制御',
            'ガードレール',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock Guardrails',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/guardrails.html',
                  note: 'AI 出力の安全性制御',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.3',
          title: 'Describe the training and fine-tuning process for foundation models.',
          jpTitle: '基盤モデルの学習とファインチューニングプロセスを説明する。',
          description: [
            'タスクステートメント 3.3: 基盤モデルの学習とファインチューニングプロセスを説明する。',
            '対象知識:',
            '- 事前学習 vs ファインチューニング',
            '- データの準備とラベリング',
            '- モデル評価メトリクス',
          ],
          knowledge: [
            'ファインチューニング',
            'Amazon Bedrock カスタムモデル',
            'RLHF（人間のフィードバックによる強化学習）',
            'モデル評価',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock カスタムモデル',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/custom-models.html',
                  note: 'モデルのカスタマイズ方法',
                  recommend: true,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 4,
      title: 'Guidelines for Responsible AI',
      jpTitle: '責任ある AI のガイドライン',
      weight: 14,
      color: '#ef4444',
      description: 'このドメインでは、AI の公平性、透明性、プライバシー、安全性、および責任ある AI 開発に関する知識が問われます。',
      tasks: [
        {
          id: '4.1',
          title: 'Explain responsible AI concepts.',
          jpTitle: '責任ある AI の概念を説明する。',
          description: [
            'タスクステートメント 4.1: 責任ある AI の概念を説明する。',
            '対象知識:',
            '- 公平性、説明可能性、透明性',
            '- バイアスの検出と軽減',
            '- ハルシネーション（幻覚）への対処',
          ],
          knowledge: [
            '公平性（Fairness）',
            '説明可能性（Explainability）',
            'バイアス検出',
            'ハルシネーション',
            'Amazon SageMaker Clarify',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS での責任ある AI',
                  url: 'https://aws.amazon.com/jp/machine-learning/responsible-ai/',
                  note: '責任ある AI の取り組み',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '4.2',
          title: 'Recognize AI limitations and mitigation strategies.',
          jpTitle: 'AI の制限と緩和戦略を認識する。',
          description: [
            'タスクステートメント 4.2: AI の制限と緩和戦略を認識する。',
            '対象知識:',
            '- モデルの制限（幻覚、バイアス、毒性）',
            '- 人間によるレビュー（Human-in-the-loop）',
          ],
          knowledge: [
            'Human-in-the-loop',
            'モデルモニタリング',
            'A/B テスト',
            '毒性（Toxicity）検出',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock モデル評価',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/model-evaluation.html',
                  note: 'モデル評価と改善',
                  recommend: true,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 5,
      title: 'Security, Compliance, and Governance for AI Solutions',
      jpTitle: 'AI ソリューションのセキュリティ、コンプライアンス、ガバナンス',
      weight: 14,
      color: '#f59e0b',
      description: 'このドメインでは、AI ソリューションにおけるデータの保護、アクセス制御、コンプライアンス要件への対応に関する知識が問われます。',
      tasks: [
        {
          id: '5.1',
          title: 'Describe AWS security services and features for AI solutions.',
          jpTitle: 'AI ソリューション向け AWS セキュリティサービスと機能を説明する。',
          description: [
            'タスクステートメント 5.1: AI ソリューション向け AWS セキュリティサービスと機能を説明する。',
            '対象知識:',
            '- データの暗号化（転送中・保存中）',
            '- IAM によるアクセス制御',
            '- AWS PrivateLink, VPC エンドポイント',
          ],
          knowledge: [
            'データ暗号化',
            'IAM ポリシー',
            'AWS PrivateLink',
            'VPC エンドポイント',
            'AWS KMS',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock セキュリティ',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/security.html',
                  note: 'Bedrock のセキュリティ設定',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '5.2',
          title: 'Describe governance and compliance for AI solutions.',
          jpTitle: 'AI ソリューションのガバナンスとコンプライアンスを説明する。',
          description: [
            'タスクステートメント 5.2: AI ソリューションのガバナンスとコンプライアンスを説明する。',
            '対象知識:',
            '- AI/ML のガバナンスフレームワーク',
            '- データプライバシーとコンプライアンス要件',
            '- モデルガバナンスと監査',
          ],
          knowledge: [
            'AI ガバナンス',
            'データプライバシー',
            'モデルカード',
            'Amazon SageMaker Model Cards',
            '監査証跡（AWS CloudTrail）',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon SageMaker ML Governance',
                  url: 'https://aws.amazon.com/jp/sagemaker/ml-governance/',
                  note: 'ML ガバナンスの概要',
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
