export const SAP_C02 = {
  id: 'sap-c02',
  code: 'SAP-C02',
  shortLabel: 'SAP',
  title: 'AWS Certified Solutions Architect - Professional',
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
              url: 'https://aws.amazon.com/jp/certification/certified-solutions-architect-professional/',
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
              title: 'AWS Certified Solutions Architect - Professional 試験ガイド (PDF)',
              url: 'https://d1.awsstatic.com/ja_JP/training-and-certification/docs-sa-pro/AWS-Certified-Solutions-Architect-Professional_Exam-Guide.pdf',
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
        'AWS Skill Builder の無料コースで、プロフェッショナルレベルのアーキテクチャ知識をインプットします。試験対策に特化したコースもあります。',
      ],
      resources: [
        {
          key: 'training',
          label: 'AWS トレーニング',
          iconClass: 'fas fa-chalkboard-teacher',
          iconColorClass: 'text-green-600',
          items: [
            {
              title: 'Exam Prep Standard Course: AWS Certified Solutions Architect - Professional',
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/14951/exam-prep-standard-course-aws-certified-solutions-architect-professional-sap-c02',
              note: 'AWS Skill Builder: 試験対策コース（無料）',
              recommend: true,
            },
            {
              title: 'Advanced Architecting on AWS',
              url: 'https://aws.amazon.com/jp/training/classroom/advanced-architecting-on-aws/',
              note: 'クラスルームトレーニング（有料）',
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
        'Domain 1: 複雑な組織に対応するソリューションの設計（26%）',
        'Domain 2: 新しいソリューションのための設計（29%）',
        'Domain 3: 既存のソリューションの継続的な改善（25%）',
        'Domain 4: ワークロードの移行とモダナイゼーションの加速（20%）',
      ],
      resources: [
        {
          key: 'whitepapers',
          label: 'ホワイトペーパー・ガイド',
          iconClass: 'fas fa-file-alt',
          iconColorClass: 'text-gray-600',
          items: [
            {
              title: 'AWS Well-Architected Framework',
              url: 'https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/framework/welcome.html',
              note: 'ホワイトペーパー: 6つの柱の詳細解説',
              recommend: true,
            },
            {
              title: 'Organizing Your AWS Environment Using Multiple Accounts',
              url: 'https://docs.aws.amazon.com/ja_jp/whitepapers/latest/organizing-your-aws-environment/organizing-your-aws-environment.html',
              note: 'マルチアカウント戦略のベストプラクティス',
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
              title: 'AWS Certification 公式練習問題集（日本語）',
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/13269/aws-certified-solutions-architect-professional-official-practice-question-set-sap-c02-japanese',
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
      title: 'Design Solutions for Organizational Complexity',
      jpTitle: '複雑な組織に対応するソリューションの設計',
      weight: 26,
      color: '#8b5cf6',
      description: 'このドメインでは、マルチアカウント戦略、クロスアカウントアクセス、ネットワーク接続性など、複雑な組織要件に対応するソリューション設計が問われます。',
      tasks: [
        {
          id: '1.1',
          title: 'Architect network connectivity strategies.',
          jpTitle: 'ネットワーク接続戦略を設計する。',
          description: [
            'タスクステートメント 1.1: ネットワーク接続戦略を設計する。',
            '対象知識:',
            '- AWS Transit Gateway、VPC ピアリング',
            '- AWS Direct Connect、Site-to-Site VPN',
            '- ハイブリッドネットワークアーキテクチャ',
          ],
          knowledge: [
            'AWS Transit Gateway',
            'VPC ピアリング',
            'AWS Direct Connect',
            'Site-to-Site VPN',
            'AWS PrivateLink',
            'AWS Network Firewall',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Transit Gateway',
                  url: 'https://docs.aws.amazon.com/ja_jp/vpc/latest/tgw/what-is-transit-gateway.html',
                  note: 'Transit Gateway の概要と使い方',
                  recommend: true,
                },
              ],
            },
            {
              key: 'blogs',
              label: 'AWS ブログ',
              iconClass: 'fab fa-aws',
              iconColorClass: 'text-orange-400',
              items: [
                {
                  title: 'AWS ネットワーキング＆コンテンツ配信ブログ',
                  url: 'https://aws.amazon.com/jp/blogs/networking-and-content-delivery/',
                  note: 'ネットワーキング関連の最新情報',
                },
              ],
            },
          ],
        },
        {
          id: '1.2',
          title: 'Prescribe security controls.',
          jpTitle: 'セキュリティ制御を規定する。',
          description: [
            'タスクステートメント 1.2: セキュリティ制御を規定する。',
            '対象知識:',
            '- AWS Organizations と SCP',
            '- AWS Control Tower',
            '- マルチアカウントのセキュリティ戦略',
          ],
          knowledge: [
            'AWS Organizations',
            'SCP（サービスコントロールポリシー）',
            'AWS Control Tower',
            'AWS Security Hub',
            'Amazon GuardDuty',
            'AWS Config',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Control Tower',
                  url: 'https://docs.aws.amazon.com/ja_jp/controltower/latest/userguide/what-is-control-tower.html',
                  note: 'マルチアカウント環境のガバナンス',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '1.3',
          title: 'Design a reliable and resilient multi-account AWS environment.',
          jpTitle: '信頼性と弾力性に優れたマルチアカウント AWS 環境を設計する。',
          description: [
            'タスクステートメント 1.3: 信頼性と弾力性に優れたマルチアカウント AWS 環境を設計する。',
            '対象知識:',
            '- マルチアカウント戦略と組織構造',
            '- クロスアカウントアクセスパターン',
            '- AWS RAM（Resource Access Manager）',
          ],
          knowledge: [
            'マルチアカウント戦略',
            'AWS RAM',
            'クロスアカウント IAM ロール',
            'AWS CloudFormation StackSets',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS マルチアカウント戦略',
                  url: 'https://docs.aws.amazon.com/ja_jp/whitepapers/latest/organizing-your-aws-environment/organizing-your-aws-environment.html',
                  note: 'マルチアカウント環境のベストプラクティス',
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
      title: 'Design for New Solutions',
      jpTitle: '新しいソリューションのための設計',
      weight: 29,
      color: '#3b82f6',
      description: 'このドメインでは、ビジネス要件を満たすための新しいソリューションの設計（デプロイ戦略、サーバーレス、マイクロサービスなど）が問われます。',
      tasks: [
        {
          id: '2.1',
          title: 'Design a deployment strategy to meet business requirements.',
          jpTitle: 'ビジネス要件を満たすデプロイ戦略を設計する。',
          description: [
            'タスクステートメント 2.1: ビジネス要件を満たすデプロイ戦略を設計する。',
            '対象知識:',
            '- Blue/Green デプロイ、カナリアデプロイ',
            '- CI/CD パイプライン（AWS CodePipeline、CodeBuild、CodeDeploy）',
            '- Infrastructure as Code（CloudFormation、CDK）',
          ],
          knowledge: [
            'Blue/Green デプロイ',
            'カナリアデプロイ',
            'AWS CodePipeline',
            'AWS CodeBuild',
            'AWS CodeDeploy',
            'AWS CloudFormation',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS でのデプロイ戦略',
                  url: 'https://docs.aws.amazon.com/ja_jp/whitepapers/latest/practicing-continuous-integration-continuous-delivery/deployment-methods.html',
                  note: 'デプロイ手法の比較',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '2.2',
          title: 'Design a solution to ensure business continuity.',
          jpTitle: '事業継続性を確保するソリューションを設計する。',
          description: [
            'タスクステートメント 2.2: 事業継続性を確保するソリューションを設計する。',
            '対象知識:',
            '- DR 戦略（バックアップ＆復元、パイロットライト、ウォームスタンバイ、マルチサイトアクティブ）',
            '- RTO/RPO の設計',
            '- マルチリージョンアーキテクチャ',
          ],
          knowledge: [
            'DR 戦略（4パターン）',
            'RTO / RPO',
            'Amazon Route 53 フェイルオーバー',
            'AWS Elastic Disaster Recovery',
            'マルチリージョン設計',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS での災害対策',
                  url: 'https://docs.aws.amazon.com/ja_jp/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-workloads-on-aws.html',
                  note: 'DR 戦略のホワイトペーパー',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '2.3',
          title: 'Determine security controls based on requirements.',
          jpTitle: '要件に基づいたセキュリティ制御を決定する。',
          description: [
            'タスクステートメント 2.3: 要件に基づいたセキュリティ制御を決定する。',
            '対象知識:',
            '- 多層セキュリティ（Defense in Depth）',
            '- データ保護（暗号化、トークン化）',
            '- 脅威検出と対応',
          ],
          knowledge: [
            'Defense in Depth',
            '暗号化戦略',
            'Amazon GuardDuty',
            'AWS Security Hub',
            'Amazon Inspector',
            'AWS WAF',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS セキュリティの柱',
                  url: 'https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/security-pillar/welcome.html',
                  note: 'Well-Architected セキュリティのベストプラクティス',
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
      title: 'Continuous Improvement for Existing Solutions',
      jpTitle: '既存のソリューションの継続的な改善',
      weight: 25,
      color: '#22c55e',
      description: 'このドメインでは、既存アーキテクチャの可用性・パフォーマンス・コスト最適化の改善策に関する知識が問われます。',
      tasks: [
        {
          id: '3.1',
          title: 'Determine a strategy to improve overall operational excellence.',
          jpTitle: '全体的な運用上の優秀性を改善する戦略を決定する。',
          description: [
            'タスクステートメント 3.1: 全体的な運用上の優秀性を改善する戦略を決定する。',
            '対象知識:',
            '- オブザーバビリティ（CloudWatch、X-Ray、CloudTrail）',
            '- 運用の自動化（Systems Manager、EventBridge）',
            '- IaC のベストプラクティス',
          ],
          knowledge: [
            'Amazon CloudWatch',
            'AWS X-Ray',
            'AWS Systems Manager',
            'Amazon EventBridge',
            'AWS CloudTrail',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS 運用上の優秀性の柱',
                  url: 'https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/operational-excellence-pillar/welcome.html',
                  note: 'Well-Architected 運用のベストプラクティス',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.2',
          title: 'Determine a strategy to improve security.',
          jpTitle: 'セキュリティを改善する戦略を決定する。',
          description: [
            'タスクステートメント 3.2: セキュリティを改善する戦略を決定する。',
            '対象知識:',
            '- セキュリティの継続的改善',
            '- 脅威モデリング、脆弱性管理',
            '- ログ分析と異常検知',
          ],
          knowledge: [
            'AWS Security Hub',
            'Amazon Detective',
            'Amazon Inspector',
            'AWS Config Rules',
            'Amazon Macie',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Security Hub',
                  url: 'https://docs.aws.amazon.com/ja_jp/securityhub/latest/userguide/what-is-securityhub.html',
                  note: 'セキュリティ態勢の統合管理',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.3',
          title: 'Determine a strategy to improve performance.',
          jpTitle: 'パフォーマンスを改善する戦略を決定する。',
          description: [
            'タスクステートメント 3.3: パフォーマンスを改善する戦略を決定する。',
            '対象知識:',
            '- キャッシュ戦略（CloudFront、ElastiCache、DAX）',
            '- データベースの最適化',
            '- コンピューティングリソースのライトサイジング',
          ],
          knowledge: [
            'Amazon CloudFront',
            'Amazon ElastiCache',
            'DynamoDB Accelerator (DAX)',
            'AWS Compute Optimizer',
            'パフォーマンスベンチマーク',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS パフォーマンス効率の柱',
                  url: 'https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/performance-efficiency-pillar/welcome.html',
                  note: 'Well-Architected パフォーマンスのベストプラクティス',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.4',
          title: 'Determine a strategy to improve cost optimization.',
          jpTitle: 'コスト最適化を改善する戦略を決定する。',
          description: [
            'タスクステートメント 3.4: コスト最適化を改善する戦略を決定する。',
            '対象知識:',
            '- コスト配分タグ、Cost Explorer',
            '- リザーブドインスタンス / Savings Plans の活用',
            '- 未使用リソースの特定と削除',
          ],
          knowledge: [
            'AWS Cost Explorer',
            'AWS Budgets',
            'コスト配分タグ',
            'AWS Trusted Advisor',
            'AWS Compute Optimizer',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS コスト最適化の柱',
                  url: 'https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/cost-optimization-pillar/welcome.html',
                  note: 'Well-Architected コスト最適化のベストプラクティス',
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
      title: 'Accelerate Workload Migration and Modernization',
      jpTitle: 'ワークロードの移行とモダナイゼーションの加速',
      weight: 20,
      color: '#f59e0b',
      description: 'このドメインでは、既存ワークロードの AWS への移行戦略、モダナイゼーション（コンテナ化、サーバーレス化）に関する知識が問われます。',
      tasks: [
        {
          id: '4.1',
          title: 'Select existing workloads and processes for potential migration.',
          jpTitle: '移行対象となる既存のワークロードとプロセスを選定する。',
          description: [
            'タスクステートメント 4.1: 移行対象となる既存のワークロードとプロセスを選定する。',
            '対象知識:',
            '- 移行アセスメントと計画',
            '- 7つの移行戦略（7R）',
            '- AWS Migration Hub、Application Discovery Service',
          ],
          knowledge: [
            '7つの移行戦略（7R）',
            'AWS Migration Hub',
            'AWS Application Discovery Service',
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
                  title: 'AWS クラウド移行',
                  url: 'https://aws.amazon.com/jp/cloud-migration/',
                  note: '移行戦略とツールの概要',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '4.2',
          title: 'Determine the optimal migration approach for existing workloads.',
          jpTitle: '既存ワークロードの最適な移行アプローチを決定する。',
          description: [
            'タスクステートメント 4.2: 既存ワークロードの最適な移行アプローチを決定する。',
            '対象知識:',
            '- データ移行サービス（DMS、DataSync、Transfer Family）',
            '- 大規模データ転送（AWS Snow Family）',
            '- データベース移行戦略',
          ],
          knowledge: [
            'AWS Database Migration Service (DMS)',
            'AWS DataSync',
            'AWS Transfer Family',
            'AWS Snow Family',
            'AWS Schema Conversion Tool',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Database Migration Service',
                  url: 'https://docs.aws.amazon.com/ja_jp/dms/latest/userguide/Welcome.html',
                  note: 'データベース移行の概要',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '4.3',
          title: 'Determine a new architecture for existing workloads.',
          jpTitle: '既存ワークロードの新しいアーキテクチャを決定する。',
          description: [
            'タスクステートメント 4.3: 既存ワークロードの新しいアーキテクチャを決定する。',
            '対象知識:',
            '- コンテナ化（ECS、EKS、Fargate）',
            '- サーバーレス化（Lambda、API Gateway、Step Functions）',
            '- マイクロサービスアーキテクチャ',
          ],
          knowledge: [
            'Amazon ECS',
            'Amazon EKS',
            'AWS Fargate',
            'AWS Lambda',
            'AWS Step Functions',
            'Amazon API Gateway',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS でのモダナイゼーション',
                  url: 'https://aws.amazon.com/jp/modernize/',
                  note: 'モダナイゼーション戦略の概要',
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
