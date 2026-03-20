export const SOA_C03 = {
  id: 'soa-c03',
  code: 'SOA-C03',
  shortLabel: 'SOA',
  title: 'AWS Certified CloudOps Engineer - Associate',
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
          key: 'official-page',
          label: '試験の公式ページ',
          iconClass: 'fas fa-file-alt',
          iconColorClass: 'text-blue-500',
          items: [
            {
              title: 'AWS Certified CloudOps Engineer - Associate 公式ページ',
              url: 'https://aws.amazon.com/jp/certification/certified-sysops-admin-associate/',
              note: '試験概要・合格条件・出題範囲などの公式情報',
              recommend: true,
            },
          ],
        },
        {
          key: 'registration',
          label: '試験の申し込み',
          iconClass: 'fas fa-clipboard-check',
          iconColorClass: 'text-indigo-500',
          items: [
            {
              title: 'AWS Training & Certification（試験申し込み）',
              url: 'https://www.aws.training/certification',
              note: 'AWS認定試験の受験登録はこちらから（公式の申し込みサイト）',
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
              title: 'AWS Certified CloudOps Engineer - Associate 試験ガイド (PDF)',
              url: 'https://d1.awsstatic.com/ja_JP/training-and-certification/docs-sysops-associate/AWS-Certified-SysOps-Administrator-Associate_Exam-Guide.pdf',
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
        'AWS Skill Builder の無料コースで、クラウド運用分野の基礎知識をインプットします。試験対策に特化したコースもあります。',
      ],
      resources: [
        {
          key: 'training',
          label: 'AWS トレーニング',
          iconClass: 'fas fa-chalkboard-teacher',
          iconColorClass: 'text-green-600',
          items: [
            {
              title: 'Exam Prep Standard Course: AWS Certified SysOps Administrator - Associate',
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/9313/exam-prep-standard-course-aws-certified-sysops-administrator-associate-soa-c02',
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
        'このアプリの Domain 1〜5 タブに切り替えて、各ドメインのタスクごとに用意されたリソースを読み進めましょう。',
        'AI 解説や AI 模擬問題も活用して、理解を深めることができます。',
      ],
      knowledge: [
        'Domain 1: モニタリング、ログ記録、分析、修復、パフォーマンスの最適化（22%）',
        'Domain 2: 信頼性と事業の継続性（22%）',
        'Domain 3: デプロイ、プロビジョニング、オートメーション（22%）',
        'Domain 4: セキュリティとコンプライアンス（16%）',
        'Domain 5: ネットワークとコンテンツ配信（18%）',
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
              title: 'AWS Well-Architected - 運用上の優秀性の柱',
              url: 'https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/operational-excellence-pillar/welcome.html',
              note: 'クラウド運用のベストプラクティス',
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
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/12555/aws-certified-sysops-administrator-associate-official-practice-question-set-soa-c02-japanese',
              note: 'AWS Skill Builder: 無料',
              recommend: true,
            },
          ],
        },
      ],
    },
  ],
  domains: [
    {
      id: 1,
      title: 'Monitoring, Logging, Analysis, Remediation, and Performance Optimization',
      jpTitle: 'モニタリング、ログ記録、分析、修復、パフォーマンスの最適化',
      weight: 22,
      color: '#3b82f6',
      description: 'このドメインでは、AWS のモニタリング・ログ記録サービスの実装、メトリクスを使用した問題の修復、コンピューティング・ストレージ・データベースのパフォーマンス最適化に関するスキルと知識が問われます。',
      tasks: [
        {
          id: '1.1',
          title: 'Implement metrics, alarms, and filters by using AWS monitoring and logging services.',
          jpTitle: 'AWS のモニタリングサービスおよびログ記録サービスを使用して、メトリクス、アラーム、フィルターを実装する。',
          description: [
            'タスク 1.1: AWS のモニタリングサービスおよびログ記録サービスを使用して、メトリクス、アラーム、フィルターを実装する。',
            '- スキル 1.1.1: AWS サービス (Amazon CloudWatch、AWS CloudTrail、Amazon Managed Service for Prometheus など) を使用して、AWS のモニタリングおよびログ記録を設定する。',
            '- スキル 1.1.2: Amazon EC2 インスタンス、Amazon Elastic Container Service (Amazon ECS) クラスター、または Amazon Elastic Kubernetes Service (Amazon EKS) クラスターからメトリクスとログを収集するように CloudWatch エージェントを設定して管理する。',
            '- スキル 1.1.3: AWS サービスを直接呼び出すことも、Amazon EventBridge を介して呼び出すこともできる CloudWatch アラームを設定、特定、トラブルシューティングする (複合アラームを作成して呼び出し可能なアクションを特定するなど)。',
            '- スキル 1.1.4: 複数のアカウントと複数の AWS リージョンにわたる AWS リソースのメトリクスとアラームを表示する、カスタマイズ可能で共有可能な CloudWatch ダッシュボードを作成、実装、管理する。',
            '- スキル 1.1.5: Amazon Simple Notification Service (Amazon SNS) に通知を送信し、Amazon SNS に通知を送信するアラームを呼び出すように AWS サービスを設定する。',
          ],
          knowledge: [
            'Amazon CloudWatch',
            'AWS CloudTrail',
            'Amazon Managed Service for Prometheus',
            'CloudWatch エージェント',
            'Amazon EventBridge',
            'Amazon SNS',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon CloudWatch ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html',
                  note: 'メトリクス・アラーム・ダッシュボードの設定',
                  recommend: true,
                },
                {
                  title: 'AWS CloudTrail ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/awscloudtrail/latest/userguide/cloudtrail-user-guide.html',
                  note: 'API 呼び出しのログ記録と監査',
                },
              ],
            },
          ],
        },
        {
          id: '1.2',
          title: 'Identify and remediate issues based on monitoring and availability metrics.',
          jpTitle: 'モニタリングと可用性のメトリクスを使用して問題を特定し、修復する。',
          description: [
            'タスク 1.2: モニタリングと可用性のメトリクスを使用して問題を特定し、修復する。',
            '- スキル 1.2.1: AWS のサービスと機能 (CloudWatch、AWS User Notifications、AWS Lambda、AWS Systems Manager、CloudTrail、自動スケーリングなど) を使用して、パフォーマンスメトリクスを分析して修復戦略を自動化する。',
            '- スキル 1.2.2: イベントの送信、エンリッチ、配信に EventBridge を使用し、イベントバスルールに関する問題のトラブルシューティングを行う。',
            '- スキル 1.2.3: カスタムおよび事前定義済みの Systems Manager Automation ランブックを (AWS SDK やカスタムスクリプトなどで) 作成または実行して、AWS でのタスクを自動化し、プロセスを合理化する。',
          ],
          knowledge: [
            'AWS Systems Manager',
            'AWS Lambda',
            'Amazon EventBridge',
            'AWS User Notifications',
            'Automation ランブック',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Systems Manager ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/what-is-systems-manager.html',
                  note: 'ランブックによる修復の自動化',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '1.3',
          title: 'Implement performance optimization strategies for compute, storage, and database resources.',
          jpTitle: 'コンピューティング、ストレージ、データベースリソースのパフォーマンスの最適化戦略を実装する。',
          description: [
            'タスク 1.3: コンピューティング、ストレージ、データベースリソースのパフォーマンスの最適化戦略を実装する。',
            '- スキル 1.3.1: パフォーマンスメトリクス、リソースタグ、AWS のツールを使用して、コンピューティングリソースを最適化し、パフォーマンスに関する問題を修復する。',
            '- スキル 1.3.2: パフォーマンス向上とコスト低減のために、Amazon Elastic Block Store (Amazon EBS) のパフォーマンスメトリクスの分析、問題のトラブルシューティング、ボリュームタイプの最適化を行う。',
            '- スキル 1.3.3: Amazon S3 パフォーマンス戦略 (AWS DataSync、S3 Transfer Acceleration、マルチパートアップロード、S3 ライフサイクルポリシーなど) を実装して最適化し、データ転送、ストレージ効率、アクセスパターンを強化する。',
            '- スキル 1.3.4: 共有ストレージソリューション [Amazon Elastic File System (Amazon EFS)、Amazon FSx など] を評価して選択し、特定のユースケースや要件に合わせてソリューション (EFS ライフサイクルポリシーなど) を最適化する。',
            '- スキル 1.3.5: Amazon RDS メトリクス (Amazon RDS Performance Insights、CloudWatch アラームなど) をモニタリングして、パフォーマンス効率を向上するために設定を変更する (Performance Insights のプロアクティブなレコメンデーション、RDS プロキシなど)。',
            '- スキル 1.3.6: EC2 インスタンスと関連するストレージおよびネットワーク機能 (EC2 プレイスメントグループなど) を実装、モニタリング、最適化する。',
          ],
          knowledge: [
            'Amazon EBS',
            'Amazon S3',
            'Amazon EFS',
            'Amazon FSx',
            'Amazon RDS',
            'Performance Insights',
            'EC2 プレイスメントグループ',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon RDS Performance Insights',
                  url: 'https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/UserGuide/USER_PerfInsights.html',
                  note: 'データベースパフォーマンスの分析',
                  recommend: true,
                },
                {
                  title: 'Amazon S3 パフォーマンスの最適化',
                  url: 'https://docs.aws.amazon.com/ja_jp/AmazonS3/latest/userguide/optimizing-performance.html',
                  note: 'S3 転送パフォーマンスのベストプラクティス',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 2,
      title: 'Reliability and Business Continuity',
      jpTitle: '信頼性と事業の継続性',
      weight: 22,
      color: '#f97316',
      description: 'このドメインでは、スケーラビリティと伸縮性の実装、可用性とレジリエンスに優れた環境の構築、バックアップと復元の戦略に関するスキルと知識が問われます。',
      tasks: [
        {
          id: '2.1',
          title: 'Implement scalability and elasticity.',
          jpTitle: 'スケーラビリティと伸縮性を実装する。',
          description: [
            'タスク 2.1: スケーラビリティと伸縮性を実装する。',
            '- スキル 2.1.1: コンピューティング環境のスケーリングメカニズムを設定して管理する。',
            '- スキル 2.1.2: AWS サービス (Amazon CloudFront、Amazon ElastiCache など) を使用してキャッシュを実装し、動的スケーラビリティを強化する。',
            '- スキル 2.1.3: AWS マネージドデータベース (Amazon RDS、Amazon DynamoDB など) のスケーリングを設定して管理する。',
          ],
          knowledge: [
            'Auto Scaling',
            'Amazon CloudFront',
            'Amazon ElastiCache',
            'Amazon RDS',
            'Amazon DynamoDB',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon EC2 Auto Scaling ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html',
                  note: 'スケーリングポリシーとメカニズムの設定',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '2.2',
          title: 'Implement highly available and resilient environments.',
          jpTitle: '可用性とレジリエンスに優れた環境を実装する。',
          description: [
            'タスク 2.2: 可用性とレジリエンスに優れた環境を実装する。',
            '- スキル 2.2.1: Elastic Load Balancing (ELB) および Amazon Route 53 ヘルスチェックを設定してトラブルシューティングを行う。',
            '- スキル 2.2.2: 耐障害性を備えたシステム (マルチ AZ 配置など) を設定する。',
          ],
          knowledge: [
            'Elastic Load Balancing',
            'Amazon Route 53',
            'マルチ AZ',
            '耐障害性',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Elastic Load Balancing ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/elasticloadbalancing/latest/userguide/what-is-load-balancing.html',
                  note: 'ロードバランシングとヘルスチェックの設定',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '2.3',
          title: 'Implement backup and restore strategies.',
          jpTitle: 'バックアップと復元の戦略を実装する。',
          description: [
            'タスク 2.3: バックアップと復元の戦略を実装する。',
            '- スキル 2.3.1: AWS サービス (AWS Backup など) を使用して、AWS リソース [Amazon EC2 インスタンス、RDS DB インスタンス、Amazon Elastic Block Store (Amazon EBS) ボリューム、Amazon S3 バケット、DynamoDB テーブルなど] のスナップショットとバックアップを自動化する。',
            '- スキル 2.3.2: 目標復旧時間 (RTO)、目標復旧時点 (RPO)、コスト要件を満たすように、さまざまな方法 (ポイントインタイム復元など) を使用してデータベースを復元する。',
            '- スキル 2.3.3: ストレージサービス (Amazon S3、Amazon FSx など) のバージョニングを実装する。',
            '- スキル 2.3.4: ディザスタリカバリ手順を実行する。',
          ],
          knowledge: [
            'AWS Backup',
            'RTO',
            'RPO',
            'ポイントインタイム復元',
            'ディザスタリカバリ',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Backup 開発者ガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/aws-backup/latest/devguide/whatisbackup.html',
                  note: 'バックアップ計画の作成と復元手順',
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
      title: 'Deployment, Provisioning, and Automation',
      jpTitle: 'デプロイ、プロビジョニング、オートメーション',
      weight: 22,
      color: '#22c55e',
      description: 'このドメインでは、クラウドリソースのプロビジョニングと保守、リソース管理の自動化に関するスキルと知識が問われます。',
      tasks: [
        {
          id: '3.1',
          title: 'Provision and maintain cloud resources.',
          jpTitle: 'クラウドリソースのプロビジョニングおよび保守を行う。',
          description: [
            'タスク 3.1: クラウドリソースのプロビジョニングおよび保守を行う。',
            '- スキル 3.1.1: AMI とコンテナイメージ (Amazon EC2 Image Builder など) を作成して管理する。',
            '- スキル 3.1.2: AWS CloudFormation と AWS Cloud Development Kit (AWS CDK) を使用し、リソーススタックを作成して管理する。',
            '- スキル 3.1.3: デプロイに関する問題 (サブネットのサイジングに関する問題、CloudFormation エラー、アクセス許可に関する問題など) を特定して修復する。',
            '- スキル 3.1.4: 複数の AWS リージョンとアカウント [AWS Resource Access Manager (AWS RAM)、CloudFormation StackSets など] にわたってリソースをプロビジョニングして共有する。',
            '- スキル 3.1.5: デプロイ戦略とサービスを実装する。',
            '- スキル 3.1.6: サードパーティーツール (Terraform、Git など) を使用して管理し、リソースのデプロイを自動化する。',
          ],
          knowledge: [
            'AMI',
            'EC2 Image Builder',
            'AWS CloudFormation',
            'AWS CDK',
            'CloudFormation StackSets',
            'Terraform',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS CloudFormation ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/Welcome.html',
                  note: 'IaC テンプレートの作成とデプロイ',
                  recommend: true,
                },
                {
                  title: 'AWS CDK 開発者ガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/home.html',
                  note: 'プログラマブルな IaC の構築',
                },
              ],
            },
          ],
        },
        {
          id: '3.2',
          title: 'Automate existing resource management.',
          jpTitle: '既存のリソース管理を自動化する。',
          description: [
            'タスク 3.2: 既存のリソース管理を自動化する。',
            '- スキル 3.2.1: AWS サービスを使用して、オペレーションプロセスを自動化する (AWS Systems Manager など)。',
            '- スキル 3.2.2: AWS のサービスと機能 (AWS Lambda、Amazon S3 イベント通知など) を使用して、イベント駆動型の自動化を実装する。',
          ],
          knowledge: [
            'AWS Systems Manager',
            'AWS Lambda',
            'Amazon S3 イベント通知',
            'イベント駆動型自動化',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Systems Manager Automation',
                  url: 'https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/systems-manager-automation.html',
                  note: 'ランブックによる運用タスクの自動化',
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
      title: 'Security and Compliance',
      jpTitle: 'セキュリティとコンプライアンス',
      weight: 16,
      color: '#a855f7',
      description: 'このドメインでは、セキュリティとコンプライアンスのツール・ポリシーの管理、データとインフラストラクチャの保護に関するスキルと知識が問われます。',
      tasks: [
        {
          id: '4.1',
          title: 'Implement and manage security and compliance tools and policies.',
          jpTitle: 'セキュリティとコンプライアンスのツールおよびポリシーを実装して管理する。',
          description: [
            'タスク 4.1: セキュリティとコンプライアンスのツールおよびポリシーを実装して管理する。',
            '- スキル 4.1.1: AWS Identity and Access Management (AWS IAM) の機能 [パスワードポリシー、多要素認証 (MFA)、ロール、フェデレーテッド ID、リソースポリシー、ポリシーの条件など] を実装する。',
            '- スキル 4.1.2: AWS ツール (AWS CloudTrail、IAM Access Analyzer、IAM Policy Simulator など) を使用して、アクセスに関する問題のトラブルシューティングと監査を行う。',
            '- スキル 4.1.3: マルチアカウント戦略を安全に実装する。',
            '- スキル 4.1.4: AWS Trusted Advisor のセキュリティチェックの結果に基づいて修復を実装する。',
            '- スキル 4.1.5: コンプライアンス要件 (AWS リージョンやサービスの選択など) を適用する。',
          ],
          knowledge: [
            'AWS IAM',
            'MFA',
            'IAM Access Analyzer',
            'IAM Policy Simulator',
            'AWS Trusted Advisor',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'IAM でのセキュリティのベストプラクティス',
                  url: 'https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/best-practices.html',
                  note: 'IAM ポリシー設計とアクセス管理',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '4.2',
          title: 'Implement strategies to protect data and infrastructure.',
          jpTitle: 'データとインフラストラクチャを保護するための戦略を実装する。',
          description: [
            'タスク 4.2: データとインフラストラクチャを保護するための戦略を実装する。',
            '- スキル 4.2.1: データ分類スキームを実装して適用する。',
            '- スキル 4.2.2: 保管中の暗号化の実装、設定、トラブルシューティングを行う [AWS Key Management Service (AWS KMS) など]。',
            '- スキル 4.2.3: 転送中の暗号化の実装、設定、トラブルシューティングを行う [AWS Certificate Manager (ACM) など]。',
            '- スキル 4.2.4: AWS サービスを使用してシークレットを安全に保管する。',
            '- スキル 4.2.5: レポートを設定して、AWS サービス (AWS Security Hub、Amazon GuardDuty、AWS Config、Amazon Inspector など) からの結果を修復する。',
          ],
          knowledge: [
            'AWS KMS',
            'AWS Certificate Manager',
            'AWS Security Hub',
            'Amazon GuardDuty',
            'AWS Config',
            'Amazon Inspector',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS KMS 開発者ガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/kms/latest/developerguide/overview.html',
                  note: '暗号化キーの作成と管理',
                  recommend: true,
                },
                {
                  title: 'AWS Security Hub ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/securityhub/latest/userguide/what-is-securityhub.html',
                  note: 'セキュリティ検出結果の一元管理',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 5,
      title: 'Networking and Content Delivery',
      jpTitle: 'ネットワークとコンテンツ配信',
      weight: 18,
      color: '#ef4444',
      description: 'このドメインでは、ネットワーク機能と接続の実装・最適化、DNS とコンテンツ配信の設定、ネットワーク接続のトラブルシューティングに関するスキルと知識が問われます。',
      tasks: [
        {
          id: '5.1',
          title: 'Implement and optimize network features and connectivity.',
          jpTitle: 'ネットワーク機能と接続を実装して最適化する。',
          description: [
            'タスク 5.1: ネットワーク機能と接続を実装して最適化する。',
            '- スキル 5.1.1: VPC を設定する (サブネット、ルートテーブル、ネットワーク ACL、セキュリティグループ、NAT ゲートウェイ、インターネットゲートウェイ、Egress-Only インターネットゲートウェイなど)。',
            '- スキル 5.1.2: プライベートネットワーク接続を設定する。',
            '- スキル 5.1.3: 単一のアカウント内の AWS ネットワーク保護サービス (Amazon Route 53 Resolver DNS Firewall、AWS WAF、AWS Shield、AWS Network Firewall など) の監査を行う。',
            '- スキル 5.1.4: ネットワークアーキテクチャのコストを最適化する。',
          ],
          knowledge: [
            'VPC',
            'サブネット',
            'ネットワーク ACL',
            'セキュリティグループ',
            'AWS WAF',
            'AWS Shield',
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
                  title: 'Amazon VPC ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/what-is-amazon-vpc.html',
                  note: 'VPC・サブネット・ルートテーブルの設定',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '5.2',
          title: 'Configure domains, DNS services, and content delivery.',
          jpTitle: 'ドメイン、DNS サービス、コンテンツ配信を設定する。',
          description: [
            'タスク 5.2: ドメイン、DNS サービス、コンテンツ配信を設定する。',
            '- スキル 5.2.1: DNS を設定する (Route 53 Resolver など)。',
            '- スキル 5.2.2: Route 53 のルーティングポリシー、設定、クエリのログ記録を実装する。',
            '- スキル 5.2.3: コンテンツとサービスの配信 (Amazon CloudFront、AWS Global Accelerator など) を設定する。',
          ],
          knowledge: [
            'Amazon Route 53',
            'Route 53 Resolver',
            'Amazon CloudFront',
            'AWS Global Accelerator',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon CloudFront 開発者ガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/AmazonCloudFront/latest/DeveloperGuide/Introduction.html',
                  note: 'CDN とコンテンツ配信の設定',
                  recommend: true,
                },
                {
                  title: 'Amazon Route 53 開発者ガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/Route53/latest/DeveloperGuide/Welcome.html',
                  note: 'DNS ルーティングポリシーの設定',
                },
              ],
            },
          ],
        },
        {
          id: '5.3',
          title: 'Troubleshoot network connectivity issues.',
          jpTitle: 'ネットワーク接続に関する問題のトラブルシューティングを行う。',
          description: [
            'タスク 5.3: ネットワーク接続に関する問題のトラブルシューティングを行う。',
            '- スキル 5.3.1: VPC の設定 (サブネット、ルートテーブル、ネットワーク ACL、セキュリティグループ、トランジットゲートウェイ、NAT ゲートウェイなど) のトラブルシューティングを行う。',
            '- スキル 5.3.2: ネットワークログ [VPC フローログ、Elastic Load Balancing (ELB) アクセスログ、AWS WAF ウェブ ACL ログ、CloudFront ログ、コンテナログなど] を収集して解釈し、問題のトラブルシューティングを行う。',
            '- スキル 5.3.3: CloudFront キャッシュの問題を特定および修復する。',
            '- スキル 5.3.4: ハイブリッド接続の問題とプライベート接続の問題を特定してトラブルシューティングを行う。',
            '- スキル 5.3.5: Amazon CloudWatch ネットワークモニタリングサービスを設定して分析する。',
          ],
          knowledge: [
            'VPC フローログ',
            'ELB アクセスログ',
            'CloudFront',
            'トランジットゲートウェイ',
            'ハイブリッド接続',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'VPC フローログ',
                  url: 'https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/flow-logs.html',
                  note: 'ネットワークトラフィックのログ収集と分析',
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
