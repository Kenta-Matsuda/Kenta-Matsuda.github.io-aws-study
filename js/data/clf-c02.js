export const CLF_C02 = {
  id: 'clf-c02',
  code: 'CLF-C02',
  shortLabel: 'CLF',
  title: 'AWS Certified Cloud Practitioner',
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
              url: 'https://aws.amazon.com/jp/certification/certified-cloud-practitioner/',
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
              title: 'AWS Certified Cloud Practitioner 試験ガイド (PDF)',
              url: 'https://d1.awsstatic.com/ja_JP/training-and-certification/docs-cloud-practitioner/AWS-Certified-Cloud-Practitioner_Exam-Guide.pdf',
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
        'AWS Skill Builder の無料コースで、クラウドの基礎知識をインプットします。試験対策に特化したコースもあります。',
      ],
      resources: [
        {
          key: 'training',
          label: 'AWS トレーニング',
          iconClass: 'fas fa-chalkboard-teacher',
          iconColorClass: 'text-green-600',
          items: [
            {
              title: 'AWS Cloud Practitioner Essentials（日本語）',
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/1875/aws-cloud-practitioner-essentials-japanese',
              note: 'AWS Skill Builder: 基礎コース（無料・6時間）',
              recommend: true,
            },
            {
              title: 'Exam Prep Standard Course: AWS Certified Cloud Practitioner',
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/16434/exam-prep-standard-course-aws-certified-cloud-practitioner-clf-c02',
              note: 'AWS Skill Builder: 試験対策コース（無料）',
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
        'このアプリの Domain 1〜4 タブに切り替えて、各ドメインのタスクごとに用意されたブログ・Black Belt・公式ドキュメントを読み進めましょう。',
        'AI 解説や AI 模擬問題も活用して、理解を深めることができます。',
      ],
      knowledge: [
        'Domain 1: クラウドのコンセプト（24%）',
        'Domain 2: セキュリティとコンプライアンス（30%）',
        'Domain 3: クラウドテクノロジーとサービス（34%）',
        'Domain 4: 請求、料金、およびサポート（12%）',
      ],
      resources: [
        {
          key: 'whitepapers',
          label: 'ホワイトペーパー・ガイド',
          iconClass: 'fas fa-file-alt',
          iconColorClass: 'text-gray-600',
          items: [
            {
              title: 'AWS クラウド導入フレームワーク (AWS CAF)',
              url: 'https://aws.amazon.com/jp/cloud-adoption-framework/',
              note: 'クラウド移行・導入の全体像',
              recommend: true,
            },
            {
              title: 'AWS Well-Architected Framework 概要',
              url: 'https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/framework/welcome.html',
              note: 'ホワイトペーパー: 6つの柱の概要',
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
              title: 'AWS Certification 公式練習問題集（日本語）',
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/19916/aws-certified-cloud-practitioner-official-practice-question-set-clf-c02-japanese',
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
      title: 'Cloud Concepts',
      jpTitle: 'クラウドのコンセプト',
      weight: 24,
      color: '#3b82f6',
      description: 'このドメインでは、AWS クラウドの価値提案、クラウドのメリット、クラウド移行戦略など、クラウドコンピューティングの基礎概念が問われます。',
      tasks: [
        {
          id: '1.1',
          title: 'Define the benefits of the AWS Cloud.',
          jpTitle: 'AWS クラウドのメリットを定義する。',
          description: [
            'タスクステートメント 1.1: AWS クラウドのメリットを定義する。',
            '対象知識:',
            '- AWS クラウドの価値提案',
            '- 高可用性、弾力性、俊敏性、およびコスト最適化のメリット',
            '- AWS グローバルインフラストラクチャ（リージョン、アベイラビリティーゾーン、エッジロケーション）',
          ],
          knowledge: [
            'AWS グローバルインフラストラクチャ',
            'リージョン',
            'アベイラビリティーゾーン',
            'エッジロケーション',
            '高可用性',
            '弾力性（Elasticity）',
          ],
          resources: [
            {
              key: 'blogs',
              label: 'AWS ブログ',
              iconClass: 'fab fa-aws',
              iconColorClass: 'text-orange-400',
              items: [
                {
                  title: 'AWS グローバルインフラストラクチャ',
                  url: 'https://aws.amazon.com/jp/about-aws/global-infrastructure/',
                  note: 'リージョン・AZ・エッジロケーションの概要',
                  recommend: true,
                },
              ],
            },
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS クラウドとは',
                  url: 'https://aws.amazon.com/jp/what-is-aws/',
                  note: 'AWS クラウドの全体像',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '1.2',
          title: 'Identify design principles of the AWS Cloud.',
          jpTitle: 'AWS クラウドの設計原則を特定する。',
          description: [
            'タスクステートメント 1.2: AWS クラウドの設計原則を特定する。',
            '対象知識:',
            '- AWS Well-Architected フレームワーク（6つの柱）',
            '- クラウド設計のベストプラクティス',
          ],
          knowledge: [
            'AWS Well-Architected フレームワーク',
            '運用上の優秀性',
            'セキュリティ',
            '信頼性',
            'パフォーマンス効率',
            'コスト最適化',
            '持続可能性',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Well-Architected フレームワーク',
                  url: 'https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/framework/welcome.html',
                  note: '6つの柱の詳細解説',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '1.3',
          title: 'Understand the benefits of and strategies for migration to the AWS Cloud.',
          jpTitle: 'AWS クラウドへの移行のメリットと戦略を理解する。',
          description: [
            'タスクステートメント 1.3: AWS クラウドへの移行のメリットと戦略を理解する。',
            '対象知識:',
            '- クラウド移行戦略（7つのR）',
            '- AWS Cloud Adoption Framework (AWS CAF)',
          ],
          knowledge: [
            'クラウド移行戦略（7R）',
            'AWS Cloud Adoption Framework (CAF)',
            'AWS Migration Hub',
            'AWS Application Migration Service',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS クラウド導入フレームワーク (AWS CAF)',
                  url: 'https://aws.amazon.com/jp/cloud-adoption-framework/',
                  note: '移行戦略・導入フレームワーク',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '1.4',
          title: 'Understand concepts of cloud economics.',
          jpTitle: 'クラウドエコノミクスの概念を理解する。',
          description: [
            'タスクステートメント 1.4: クラウドエコノミクスの概念を理解する。',
            '対象知識:',
            '- 固定費と変動費の比較',
            '- クラウドの総所有コスト（TCO）',
            '- ライセンスモデルの考慮事項',
          ],
          knowledge: [
            '総所有コスト（TCO）',
            '固定費 vs 変動費',
            'スケールメリット',
            'ライセンスモデル（BYOL）',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'クラウドの経済性',
                  url: 'https://aws.amazon.com/jp/economics/',
                  note: 'AWS のコストメリット',
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
      title: 'Security and Compliance',
      jpTitle: 'セキュリティとコンプライアンス',
      weight: 30,
      color: '#ef4444',
      description: 'このドメインでは、AWS の責任共有モデル、アクセス管理、セキュリティサービス、コンプライアンスに関する知識が問われます。',
      tasks: [
        {
          id: '2.1',
          title: 'Understand the AWS Shared Responsibility Model.',
          jpTitle: 'AWS 責任共有モデルを理解する。',
          description: [
            'タスクステートメント 2.1: AWS 責任共有モデルを理解する。',
            '対象知識:',
            '- AWS と顧客の責任範囲',
            '- サービスによる責任範囲の違い（IaaS / PaaS / SaaS）',
          ],
          knowledge: [
            'AWS 責任共有モデル',
            'IaaS / PaaS / SaaS',
            'AWS の責任（クラウドのセキュリティ）',
            '顧客の責任（クラウド内のセキュリティ）',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS 責任共有モデル',
                  url: 'https://aws.amazon.com/jp/compliance/shared-responsibility-model/',
                  note: '責任範囲の詳細',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '2.2',
          title: 'Understand AWS Cloud security, governance, and compliance concepts.',
          jpTitle: 'AWS クラウドのセキュリティ、ガバナンス、コンプライアンスの概念を理解する。',
          description: [
            'タスクステートメント 2.2: AWS クラウドのセキュリティ、ガバナンス、コンプライアンスの概念を理解する。',
            '対象知識:',
            '- コンプライアンスプログラム、AWS Artifact',
            '- AWS CloudTrail、AWS Config によるガバナンス',
          ],
          knowledge: [
            'AWS Artifact',
            'AWS CloudTrail',
            'AWS Config',
            'コンプライアンスプログラム',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS コンプライアンス',
                  url: 'https://aws.amazon.com/jp/compliance/',
                  note: 'コンプライアンスプログラム一覧',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '2.3',
          title: 'Identify AWS access management capabilities.',
          jpTitle: 'AWS のアクセス管理機能を特定する。',
          description: [
            'タスクステートメント 2.3: AWS のアクセス管理機能を特定する。',
            '対象知識:',
            '- IAM ユーザー、グループ、ロール、ポリシー',
            '- AWS IAM Identity Center (SSO)',
            '- 多要素認証 (MFA)',
          ],
          knowledge: [
            'AWS IAM',
            'IAM ポリシー',
            'IAM ロール',
            'AWS IAM Identity Center',
            '多要素認証 (MFA)',
            'ルートユーザー',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS IAM ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/introduction.html',
                  note: 'IAM の基礎',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '2.4',
          title: 'Identify components and resources for security.',
          jpTitle: 'セキュリティのコンポーネントとリソースを特定する。',
          description: [
            'タスクステートメント 2.4: セキュリティのコンポーネントとリソースを特定する。',
            '対象知識:',
            '- セキュリティグループ、ネットワークACL',
            '- AWS WAF、AWS Shield、Amazon GuardDuty',
            '- AWS KMS、AWS Secrets Manager',
          ],
          knowledge: [
            'セキュリティグループ',
            'ネットワークACL',
            'AWS WAF',
            'AWS Shield',
            'Amazon GuardDuty',
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
                  title: 'AWS セキュリティサービス概要',
                  url: 'https://aws.amazon.com/jp/products/security/',
                  note: 'セキュリティサービスの全体像',
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
      title: 'Cloud Technology and Services',
      jpTitle: 'クラウドテクノロジーとサービス',
      weight: 34,
      color: '#22c55e',
      description: 'このドメインでは、AWS の主要なサービス（コンピューティング、ストレージ、データベース、ネットワーキング等）とその使い分けに関する知識が問われます。',
      tasks: [
        {
          id: '3.1',
          title: 'Define methods of deploying and operating in the AWS Cloud.',
          jpTitle: 'AWS クラウドでのデプロイおよび運用方法を定義する。',
          description: [
            'タスクステートメント 3.1: AWS クラウドでのデプロイおよび運用方法を定義する。',
            '対象知識:',
            '- AWS マネジメントコンソール、CLI、SDK',
            '- Infrastructure as Code（AWS CloudFormation）',
          ],
          knowledge: [
            'AWS マネジメントコンソール',
            'AWS CLI',
            'AWS SDK',
            'AWS CloudFormation',
            'AWS CDK',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS マネジメントコンソール入門',
                  url: 'https://aws.amazon.com/jp/console/',
                  note: 'コンソールの概要',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.2',
          title: 'Define the AWS global infrastructure.',
          jpTitle: 'AWS グローバルインフラストラクチャを定義する。',
          description: [
            'タスクステートメント 3.2: AWS グローバルインフラストラクチャを定義する。',
            '対象知識:',
            '- リージョン、アベイラビリティーゾーン、エッジロケーション',
            '- 高可用性の実現方法',
          ],
          knowledge: [
            'リージョン選択の考慮事項',
            'マルチAZ配置',
            'Amazon CloudFront',
            'AWS Local Zones',
            'AWS Outposts',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS グローバルインフラストラクチャ',
                  url: 'https://aws.amazon.com/jp/about-aws/global-infrastructure/',
                  note: 'リージョン・AZ 一覧',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.3',
          title: 'Identify AWS compute services.',
          jpTitle: 'AWS のコンピューティングサービスを特定する。',
          description: [
            'タスクステートメント 3.3: AWS のコンピューティングサービスを特定する。',
            '対象知識:',
            '- Amazon EC2、AWS Lambda、Amazon ECS/EKS、AWS Fargate',
            '- ユースケースごとの使い分け',
          ],
          knowledge: [
            'Amazon EC2',
            'AWS Lambda',
            'Amazon ECS',
            'Amazon EKS',
            'AWS Fargate',
            'AWS Elastic Beanstalk',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS コンピューティングサービス',
                  url: 'https://aws.amazon.com/jp/products/compute/',
                  note: 'コンピューティングサービスの全体像',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.4',
          title: 'Identify AWS database services.',
          jpTitle: 'AWS のデータベースサービスを特定する。',
          description: [
            'タスクステートメント 3.4: AWS のデータベースサービスを特定する。',
            '対象知識:',
            '- Amazon RDS、Amazon Aurora、Amazon DynamoDB',
            '- Amazon Redshift、Amazon ElastiCache',
          ],
          knowledge: [
            'Amazon RDS',
            'Amazon Aurora',
            'Amazon DynamoDB',
            'Amazon Redshift',
            'Amazon ElastiCache',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS データベースサービス',
                  url: 'https://aws.amazon.com/jp/products/databases/',
                  note: 'データベースサービスの全体像',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.5',
          title: 'Identify AWS network services.',
          jpTitle: 'AWS のネットワークサービスを特定する。',
          description: [
            'タスクステートメント 3.5: AWS のネットワークサービスを特定する。',
            '対象知識:',
            '- Amazon VPC、サブネット、ルートテーブル',
            '- Elastic Load Balancing、Amazon Route 53',
          ],
          knowledge: [
            'Amazon VPC',
            'サブネット',
            'インターネットゲートウェイ',
            'NAT ゲートウェイ',
            'Elastic Load Balancing',
            'Amazon Route 53',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon VPC ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/what-is-amazon-vpc.html',
                  note: 'VPC の基礎',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.6',
          title: 'Identify AWS storage services.',
          jpTitle: 'AWS のストレージサービスを特定する。',
          description: [
            'タスクステートメント 3.6: AWS のストレージサービスを特定する。',
            '対象知識:',
            '- Amazon S3、Amazon EBS、Amazon EFS',
            '- ストレージクラスの使い分け',
          ],
          knowledge: [
            'Amazon S3',
            'S3 ストレージクラス',
            'Amazon EBS',
            'Amazon EFS',
            'AWS Storage Gateway',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS ストレージサービス',
                  url: 'https://aws.amazon.com/jp/products/storage/',
                  note: 'ストレージサービスの全体像',
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
      title: 'Billing, Pricing, and Support',
      jpTitle: '請求、料金、およびサポート',
      weight: 12,
      color: '#f59e0b',
      description: 'このドメインでは、AWS の料金モデル、請求管理、サポートプランに関する知識が問われます。',
      tasks: [
        {
          id: '4.1',
          title: 'Compare AWS pricing models.',
          jpTitle: 'AWS の料金モデルを比較する。',
          description: [
            'タスクステートメント 4.1: AWS の料金モデルを比較する。',
            '対象知識:',
            '- オンデマンド、リザーブド、スポット、Savings Plans',
            '- 無料利用枠',
          ],
          knowledge: [
            'オンデマンドインスタンス',
            'リザーブドインスタンス',
            'Savings Plans',
            'スポットインスタンス',
            'AWS 無料利用枠',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS 料金',
                  url: 'https://aws.amazon.com/jp/pricing/',
                  note: '料金モデルの概要',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '4.2',
          title: 'Understand resources for billing, budget, and cost management.',
          jpTitle: '請求、予算、コスト管理のためのリソースを理解する。',
          description: [
            'タスクステートメント 4.2: 請求、予算、コスト管理のためのリソースを理解する。',
            '対象知識:',
            '- AWS Billing and Cost Management、AWS Budgets',
            '- AWS Cost Explorer、AWS Pricing Calculator',
          ],
          knowledge: [
            'AWS Billing and Cost Management',
            'AWS Budgets',
            'AWS Cost Explorer',
            'AWS Pricing Calculator',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Billing and Cost Management',
                  url: 'https://docs.aws.amazon.com/ja_jp/account-billing/index.html',
                  note: '請求・コスト管理の基礎',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '4.3',
          title: 'Identify AWS technical resources and AWS Support options.',
          jpTitle: 'AWS の技術リソースとサポートオプションを特定する。',
          description: [
            'タスクステートメント 4.3: AWS の技術リソースとサポートオプションを特定する。',
            '対象知識:',
            '- AWS サポートプラン（Basic / Developer / Business / Enterprise）',
            '- AWS Trusted Advisor、AWS Health Dashboard',
          ],
          knowledge: [
            'AWS サポートプラン',
            'AWS Trusted Advisor',
            'AWS Health Dashboard',
            'AWS re:Post',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS サポートプランの比較',
                  url: 'https://aws.amazon.com/jp/premiumsupport/plans/',
                  note: '各プランの詳細比較',
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
