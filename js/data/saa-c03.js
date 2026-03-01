export const SAA_C03 = {
  id: 'saa-c03',
  code: 'SAA-C03',
  shortLabel: 'SAA',
  title: 'AWS Certified Solutions Architect - Associate',
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
              url: 'https://aws.amazon.com/jp/certification/certified-solutions-architect-associate/',
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
              title: 'AWS Certified Solutions Architect - Associate 試験ガイド (PDF)',
              url: 'https://d1.awsstatic.com/ja_JP/training-and-certification/docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Exam-Guide.pdf',
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
        'AWS Skill Builder の無料コースで、ソリューションアーキテクチャの基礎知識をインプットします。試験対策に特化したコースもあります。',
      ],
      resources: [
        {
          key: 'training',
          label: 'AWS トレーニング',
          iconClass: 'fas fa-chalkboard-teacher',
          iconColorClass: 'text-green-600',
          items: [
            {
              title: 'Exam Prep Standard Course: AWS Certified Solutions Architect - Associate',
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/14760/exam-prep-standard-course-aws-certified-solutions-architect-associate-saa-c03',
              note: 'AWS Skill Builder: 試験対策コース（無料）',
              recommend: true,
            },
            {
              title: 'AWS Technical Essentials',
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/1851/aws-technical-essentials',
              note: 'AWS Skill Builder: 技術基礎コース（無料）',
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
        'Domain 1: セキュアなアーキテクチャの設計（30%）',
        'Domain 2: 弾力性に優れたアーキテクチャの設計（26%）',
        'Domain 3: 高パフォーマンスなアーキテクチャの設計（24%）',
        'Domain 4: コスト最適化されたアーキテクチャの設計（20%）',
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
              title: 'AWS Well-Architected Labs',
              url: 'https://www.wellarchitectedlabs.com/',
              note: 'ハンズオンラボで実践的に学ぶ',
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
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/13269/aws-certified-solutions-architect-associate-official-practice-question-set-saa-c03-japanese',
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
      title: 'Design Secure Architectures',
      jpTitle: 'セキュアなアーキテクチャの設計',
      weight: 30,
      color: '#ef4444',
      description: 'このドメインでは、AWS リソースへのセキュアなアクセス、セキュアなワークロードとアプリケーションの設計に関する知識が問われます。',
      tasks: [
        {
          id: '1.1',
          title: 'Design secure access to AWS resources.',
          jpTitle: 'AWS リソースへのセキュアなアクセスを設計する。',
          description: [
            'タスクステートメント 1.1: AWS リソースへのセキュアなアクセスを設計する。',
            '対象知識:',
            '- IAM ユーザー、グループ、ロール、ポリシー',
            '- フェデレーションアクセス、クロスアカウントアクセス',
            '- AWS IAM Identity Center、AWS Organizations',
          ],
          knowledge: [
            'AWS IAM',
            'IAM ポリシー',
            'IAM ロール',
            'AWS Organizations',
            'AWS IAM Identity Center',
            'SCP（サービスコントロールポリシー）',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS IAM ベストプラクティス',
                  url: 'https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/best-practices.html',
                  note: 'IAM のセキュリティベストプラクティス',
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
                  title: 'AWS Organizations を使ったマルチアカウント管理',
                  url: 'https://aws.amazon.com/jp/organizations/',
                  note: '組織管理の概要',
                },
              ],
            },
          ],
        },
        {
          id: '1.2',
          title: 'Design secure workloads and applications.',
          jpTitle: 'セキュアなワークロードとアプリケーションを設計する。',
          description: [
            'タスクステートメント 1.2: セキュアなワークロードとアプリケーションを設計する。',
            '対象知識:',
            '- セキュリティグループ、ネットワークACL',
            '- AWS WAF、AWS Shield',
            '- 暗号化（転送中・保存中）、AWS KMS',
          ],
          knowledge: [
            'セキュリティグループ',
            'ネットワークACL',
            'AWS WAF',
            'AWS Shield',
            'AWS KMS',
            'AWS Certificate Manager',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS セキュリティのベストプラクティス',
                  url: 'https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/security-pillar/welcome.html',
                  note: 'Well-Architected セキュリティの柱',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '1.3',
          title: 'Determine appropriate data security controls.',
          jpTitle: '適切なデータセキュリティ制御を決定する。',
          description: [
            'タスクステートメント 1.3: 適切なデータセキュリティ制御を決定する。',
            '対象知識:',
            '- データ分類とライフサイクル管理',
            '- S3 のアクセス制御（バケットポリシー、ACL、S3 アクセスポイント）',
            '- データベースの暗号化',
          ],
          knowledge: [
            'S3 バケットポリシー',
            'S3 アクセスポイント',
            'Amazon Macie',
            'AWS Secrets Manager',
            'データ暗号化',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon S3 セキュリティのベストプラクティス',
                  url: 'https://docs.aws.amazon.com/ja_jp/AmazonS3/latest/userguide/security-best-practices.html',
                  note: 'S3 のセキュリティ設定',
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
      title: 'Design Resilient Architectures',
      jpTitle: '弾力性に優れたアーキテクチャの設計',
      weight: 26,
      color: '#3b82f6',
      description: 'このドメインでは、スケーラブルで疎結合なアーキテクチャ、高可用性・耐障害性の設計に関する知識が問われます。',
      tasks: [
        {
          id: '2.1',
          title: 'Design scalable and loosely coupled architectures.',
          jpTitle: 'スケーラブルで疎結合なアーキテクチャを設計する。',
          description: [
            'タスクステートメント 2.1: スケーラブルで疎結合なアーキテクチャを設計する。',
            '対象知識:',
            '- API 駆動型アーキテクチャ',
            '- マイクロサービス（Amazon ECS、EKS、Lambda）',
            '- メッセージキュー（Amazon SQS、SNS、EventBridge）',
          ],
          knowledge: [
            'Amazon SQS',
            'Amazon SNS',
            'Amazon EventBridge',
            'Amazon API Gateway',
            'Elastic Load Balancing',
            'Auto Scaling',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Well-Architected - 信頼性の柱',
                  url: 'https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/reliability-pillar/welcome.html',
                  note: '信頼性設計のベストプラクティス',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '2.2',
          title: 'Design highly available and/or fault-tolerant architectures.',
          jpTitle: '高可用性および/または耐障害性のあるアーキテクチャを設計する。',
          description: [
            'タスクステートメント 2.2: 高可用性および/または耐障害性のあるアーキテクチャを設計する。',
            '対象知識:',
            '- マルチAZ/マルチリージョン構成',
            '- ELB、Auto Scaling、Route 53 ヘルスチェック',
            '- バックアップと復元戦略',
          ],
          knowledge: [
            'マルチAZ配置',
            'マルチリージョン',
            'Amazon Route 53 フェイルオーバー',
            'Amazon RDS マルチAZ',
            'Amazon Aurora',
            'AWS Backup',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS での高可用性アーキテクチャ',
                  url: 'https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/reliability-pillar/plan-for-disaster-recovery-dr.html',
                  note: 'DR 計画のベストプラクティス',
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
      title: 'Design High-Performing Architectures',
      jpTitle: '高パフォーマンスなアーキテクチャの設計',
      weight: 24,
      color: '#22c55e',
      description: 'このドメインでは、高パフォーマンスなストレージ、コンピューティング、データベース、ネットワーキングソリューションの選定に関する知識が問われます。',
      tasks: [
        {
          id: '3.1',
          title: 'Determine high-performing and/or scalable storage solutions.',
          jpTitle: '高パフォーマンスかつスケーラブルなストレージソリューションを決定する。',
          description: [
            'タスクステートメント 3.1: 高パフォーマンスかつスケーラブルなストレージソリューションを決定する。',
            '対象知識:',
            '- Amazon S3、EBS、EFS の使い分け',
            '- S3 ストレージクラスとライフサイクルポリシー',
          ],
          knowledge: [
            'Amazon S3',
            'Amazon EBS（gp3, io2, st1, sc1）',
            'Amazon EFS',
            'Amazon FSx',
            'S3 Transfer Acceleration',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS ストレージサービスの選択',
                  url: 'https://aws.amazon.com/jp/products/storage/',
                  note: 'ストレージの比較と選択',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.2',
          title: 'Design high-performing and elastic compute solutions.',
          jpTitle: '高パフォーマンスでエラスティックなコンピューティングソリューションを設計する。',
          description: [
            'タスクステートメント 3.2: 高パフォーマンスでエラスティックなコンピューティングソリューションを設計する。',
            '対象知識:',
            '- EC2 インスタンスタイプの選択',
            '- Auto Scaling 戦略',
            '- サーバーレスコンピューティング（Lambda、Fargate）',
          ],
          knowledge: [
            'EC2 インスタンスタイプ',
            'Auto Scaling',
            'AWS Lambda',
            'AWS Fargate',
            'Amazon EC2 スポットインスタンス',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon EC2 インスタンスタイプ',
                  url: 'https://aws.amazon.com/jp/ec2/instance-types/',
                  note: 'インスタンスタイプの比較',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.3',
          title: 'Determine high-performing database solutions.',
          jpTitle: '高パフォーマンスなデータベースソリューションを決定する。',
          description: [
            'タスクステートメント 3.3: 高パフォーマンスなデータベースソリューションを決定する。',
            '対象知識:',
            '- RDS、Aurora、DynamoDB の使い分け',
            '- キャッシュ戦略（ElastiCache、DAX）',
            '- リードレプリカ、グローバルデータベース',
          ],
          knowledge: [
            'Amazon RDS',
            'Amazon Aurora',
            'Amazon DynamoDB',
            'Amazon ElastiCache',
            'DynamoDB Accelerator (DAX)',
            'リードレプリカ',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS データベースサービスの選択',
                  url: 'https://aws.amazon.com/jp/products/databases/',
                  note: 'データベースの比較と選択',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.4',
          title: 'Determine high-performing and/or scalable network architectures.',
          jpTitle: '高パフォーマンスかつスケーラブルなネットワークアーキテクチャを決定する。',
          description: [
            'タスクステートメント 3.4: 高パフォーマンスかつスケーラブルなネットワークアーキテクチャを決定する。',
            '対象知識:',
            '- Amazon CloudFront、AWS Global Accelerator',
            '- VPC エンドポイント、AWS PrivateLink',
          ],
          knowledge: [
            'Amazon CloudFront',
            'AWS Global Accelerator',
            'VPC エンドポイント',
            'AWS PrivateLink',
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
                  title: 'AWS ネットワーキングサービス',
                  url: 'https://aws.amazon.com/jp/products/networking/',
                  note: 'ネットワーキングサービスの概要',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.5',
          title: 'Determine high-performing data ingestion and transformation solutions.',
          jpTitle: '高パフォーマンスなデータ取り込み・変換ソリューションを決定する。',
          description: [
            'タスクステートメント 3.5: 高パフォーマンスなデータ取り込み・変換ソリューションを決定する。',
            '対象知識:',
            '- Amazon Kinesis、AWS Glue',
            '- Amazon Athena、Amazon Redshift',
          ],
          knowledge: [
            'Amazon Kinesis Data Streams',
            'Amazon Kinesis Data Firehose',
            'AWS Glue',
            'Amazon Athena',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS 分析サービス',
                  url: 'https://aws.amazon.com/jp/big-data/datalakes-and-analytics/',
                  note: '分析サービスの概要',
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
      title: 'Design Cost-Optimized Architectures',
      jpTitle: 'コスト最適化されたアーキテクチャの設計',
      weight: 20,
      color: '#f59e0b',
      description: 'このドメインでは、コスト効率に優れたストレージ、コンピューティング、データベースソリューションの選定に関する知識が問われます。',
      tasks: [
        {
          id: '4.1',
          title: 'Design cost-optimized storage solutions.',
          jpTitle: 'コスト最適化されたストレージソリューションを設計する。',
          description: [
            'タスクステートメント 4.1: コスト最適化されたストレージソリューションを設計する。',
            '対象知識:',
            '- S3 ストレージクラスの最適化',
            '- S3 Intelligent-Tiering、Glacier',
            '- EBS ボリュームタイプの選択',
          ],
          knowledge: [
            'S3 Intelligent-Tiering',
            'S3 Glacier',
            'S3 ライフサイクルポリシー',
            'EBS ボリュームタイプ',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon S3 ストレージクラス',
                  url: 'https://aws.amazon.com/jp/s3/storage-classes/',
                  note: 'ストレージクラスの料金比較',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '4.2',
          title: 'Design cost-optimized compute and database services.',
          jpTitle: 'コスト最適化されたコンピューティングおよびデータベースサービスを設計する。',
          description: [
            'タスクステートメント 4.2: コスト最適化されたコンピューティングおよびデータベースサービスを設計する。',
            '対象知識:',
            '- 購入オプション（リザーブド、Savings Plans、スポット）',
            '- サーバーレスによるコスト削減',
            '- 適切なデータベースエンジンの選択',
          ],
          knowledge: [
            'リザーブドインスタンス',
            'Savings Plans',
            'スポットインスタンス',
            'AWS Lambda 料金',
            'Amazon Aurora Serverless',
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
        {
          id: '4.3',
          title: 'Design cost-optimized network architectures.',
          jpTitle: 'コスト最適化されたネットワークアーキテクチャを設計する。',
          description: [
            'タスクステートメント 4.3: コスト最適化されたネットワークアーキテクチャを設計する。',
            '対象知識:',
            '- データ転送コストの最適化',
            '- VPC エンドポイントの活用',
            '- CloudFront による転送量削減',
          ],
          knowledge: [
            'データ転送コスト',
            'VPC エンドポイント',
            'Amazon CloudFront',
            'NAT ゲートウェイのコスト',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS データ転送料金',
                  url: 'https://aws.amazon.com/jp/ec2/pricing/on-demand/#Data_Transfer',
                  note: 'データ転送コストの詳細',
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
