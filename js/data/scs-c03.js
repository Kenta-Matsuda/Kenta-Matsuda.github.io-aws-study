export const SCS_C03 = {
  id: 'scs-c03',
  code: 'SCS-C03',
  shortLabel: 'SCS',
  title: 'AWS Certified Security - Specialty',
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
              title: 'AWS Certified Security - Specialty 公式ページ',
              url: 'https://aws.amazon.com/jp/certification/certified-security-specialty/',
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
              title: 'AWS Certified Security - Specialty 試験ガイド (PDF)',
              url: 'https://d1.awsstatic.com/ja_JP/training-and-certification/docs-security-spec/AWS-Certified-Security-Specialty_Exam-Guide.pdf',
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
        'AWS Skill Builder の無料コースで、セキュリティ分野の基礎知識をインプットします。試験対策に特化したコースもあります。',
      ],
      resources: [
        {
          key: 'training',
          label: 'AWS トレーニング',
          iconClass: 'fas fa-chalkboard-teacher',
          iconColorClass: 'text-green-600',
          items: [
            {
              title: 'Exam Prep Standard Course: AWS Certified Security - Specialty',
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/15097/exam-prep-standard-course-aws-certified-security-specialty-scs-c02',
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
        'このアプリの Domain 1〜6 タブに切り替えて、各ドメインのタスクごとに用意されたリソースを読み進めましょう。',
        'AI 解説や AI 模擬問題も活用して、理解を深めることができます。',
      ],
      knowledge: [
        'Domain 1: 検出（16%）',
        'Domain 2: インシデント対応（14%）',
        'Domain 3: インフラストラクチャのセキュリティ（18%）',
        'Domain 4: Identity and Access Management（20%）',
        'Domain 5: データ保護（18%）',
        'Domain 6: セキュリティ基盤とガバナンス（14%）',
      ],
      resources: [
        {
          key: 'whitepapers',
          label: 'ホワイトペーパー・ガイド',
          iconClass: 'fas fa-file-alt',
          iconColorClass: 'text-gray-600',
          items: [
            {
              title: 'AWS Well-Architected フレームワーク',
              url: 'https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/framework/welcome.html',
              note: 'AWS のベストプラクティスフレームワーク',
              recommend: true,
            },
            {
              title: 'AWS Well-Architected フレームワーク — セキュリティの柱',
              url: 'https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/security-pillar/welcome.html',
              note: 'セキュリティ設計のベストプラクティス',
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
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/15111/aws-certified-security-specialty-official-practice-question-set-scs-c02-japanese',
              note: 'AWS Skill Builder: 無料',
              recommend: true,
            },
          ],
        },
      ],
    }
    },
  ],
      ],
    },
  ],
  domains: [
    {
      id: 1,
      title: 'Detection',
      jpTitle: '検出',
      weight: 16,
      color: '#3b82f6',
      description: 'このドメインでは、AWS アカウントまたは組織向けのモニタリング・アラートソリューションの設計と実装、ロギングソリューションの設計と実装、セキュリティモニタリング・ロギング・アラートソリューションのトラブルシューティングに関するスキルと知識が問われます。',
      tasks: [
        {
          id: '1.1',
          title: 'Design and implement monitoring and alerting solutions for AWS accounts or organizations.',
          jpTitle: 'AWS アカウントまたは組織向けのモニタリングおよびアラートソリューションを設計し、実装する。',
          description: [
            'タスク 1.1: AWS アカウントまたは組織向けのモニタリングおよびアラートソリューションを設計し、実装する。',
            '- スキル 1.1.1: ワークロードを分析してモニタリング要件を判断する。',
            '- スキル 1.1.2: ワークロードモニタリング戦略を設計して実装する (リソースのヘルスチェックの設定など)。',
            '- スキル 1.1.3: セキュリティとモニタリングイベントを集約する。',
            '- スキル 1.1.4: メトリクス、アラート、ダッシュボードを作成し、異常なデータやイベントを検出する (Amazon GuardDuty、Amazon Security Lake、AWS Security Hub、Amazon Macie など)。',
            '- スキル 1.1.5: オートメーションを作成して管理し、定期的な評価と調査を行う (AWS Config コンフォーマンスパック、Security Hub、AWS Systems Manager State Manager のデプロイなど)。',
          ],
          knowledge: [
            'Amazon GuardDuty',
            'Amazon Security Lake',
            'AWS Security Hub',
            'Amazon Macie',
            'AWS Config',
            'Systems Manager State Manager',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon GuardDuty ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/guardduty/latest/ug/what-is-guardduty.html',
                  note: '脅威検出とセキュリティモニタリング',
                  recommend: true,
                },
                {
                  title: 'AWS Security Hub ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/securityhub/latest/userguide/what-is-securityhub.html',
                  note: 'セキュリティ検出結果の集約・管理',
                },
              ],
            },
          ],
        },
        {
          id: '1.2',
          title: 'Design and implement logging solutions.',
          jpTitle: 'ロギングソリューションを設計し、実装する。',
          description: [
            'タスク 1.2: ロギングソリューションを設計し、実装する。',
            '- スキル 1.2.1: 要件に基づいてログの取り込みとストレージのソースを特定する。',
            '- スキル 1.2.2: AWS のサービスとアプリケーションのロギングを設定する (組織の AWS CloudTrail 証跡の設定、専用の Amazon CloudWatch ロギングアカウントの作成、Amazon CloudWatch Logs エージェントの設定など)。',
            '- スキル 1.2.3: ログストレージとログデータレイク (Security Lake など) を実装し、サードパーティーのセキュリティツールと統合する。',
            '- スキル 1.2.4: AWS のサービスを使用してログを分析する (CloudWatch Logs Insights、Amazon Athena、Security Hub の検出結果など)。',
            '- スキル 1.2.5: AWS のサービスを使用してログの正規化、解析、関連付けを行う (Amazon OpenSearch Service、AWS Lambda、Amazon Managed Grafana など)。',
            '- スキル 1.2.6: ネットワーク設計、脅威、攻撃に基づいて適切なログソースを判断し、設定する (VPC フローログ、Transit Gateway フローログ、Amazon Route 53 Resolver ログなど)。',
          ],
          knowledge: [
            'AWS CloudTrail',
            'Amazon CloudWatch Logs',
            'Amazon Security Lake',
            'Amazon Athena',
            'Amazon OpenSearch Service',
            'VPC フローログ',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS CloudTrail ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/awscloudtrail/latest/userguide/cloudtrail-user-guide.html',
                  note: 'API コールの記録・セキュリティ監査',
                  recommend: true,
                },
                {
                  title: 'Amazon CloudWatch Logs ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html',
                  note: 'ログの収集・保存・分析',
                },
              ],
            },
          ],
        },
        {
          id: '1.3',
          title: 'Troubleshoot security monitoring, logging, and alerting solutions.',
          jpTitle: 'セキュリティモニタリング、ロギング、アラートソリューションをトラブルシューティングする。',
          description: [
            'タスク 1.3: セキュリティモニタリング、ロギング、アラートソリューションをトラブルシューティングする。',
            '- スキル 1.3.1: リソースの機能、アクセス許可、設定を分析する (Lambda 関数ロギング、Amazon API Gateway ロギング、ヘルスチェック、Amazon CloudFront ロギングなど)。',
            '- スキル 1.3.2: リソースの設定ミスを修正する (CloudWatch Agent 設定のトラブルシューティング、不足しているログのトラブルシューティングなど)。',
          ],
          knowledge: [
            'Lambda 関数ロギング',
            'Amazon API Gateway',
            'Amazon CloudFront',
            'CloudWatch Agent',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'CloudWatch Agent の設定',
                  url: 'https://docs.aws.amazon.com/ja_jp/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html',
                  note: 'CloudWatch Agent のインストールとトラブルシューティング',
                  recommend: true,
                },
                {
                  title: 'AWS Lambda のログ設定',
                  url: 'https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/monitoring-cloudwatchlogs.html',
                  note: 'Lambda 関数のログ出力設定',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 2,
      title: 'Incident Response',
      jpTitle: 'インシデント対応',
      weight: 14,
      color: '#f97316',
      description: 'このドメインでは、インシデント対応計画の策定とテスト、セキュリティイベントへの対応に関するスキルと知識が問われます。',
      tasks: [
        {
          id: '2.1',
          title: 'Develop and test an incident response plan.',
          jpTitle: 'インシデント対応計画を策定し、テストする。',
          description: [
            'タスク 2.1: インシデント対応計画を策定し、テストする。',
            '- スキル 2.1.1: セキュリティインシデントに対応するための対応計画とランブックを策定し、実装する (Systems Manager OpsCenter、Amazon SageMaker AI ノートブックなど)。',
            '- スキル 2.1.2: AWS のサービスと機能を使用し、インシデントに備えてサービスを設定する (アクセスのプロビジョニング、セキュリティツールのデプロイ、影響範囲の最小化、AWS Shield Advanced 保護の設定など)。',
            '- スキル 2.1.3: インシデント対応計画の有効性のテストと検証のための手順を推奨する (AWS Fault Injection Service、AWS Resilience Hub など)。',
            '- スキル 2.1.4: AWS のサービスを使用してインシデントを自動的に修復する (Systems Manager、Automated Forensics Orchestrator for Amazon EC2、AWS Step Functions、Amazon Application Recovery Controller、Lambda 関数など)。',
          ],
          knowledge: [
            'Systems Manager OpsCenter',
            'AWS Shield Advanced',
            'AWS Fault Injection Service',
            'AWS Resilience Hub',
            'AWS Step Functions',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS セキュリティインシデント対応ガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/whitepapers/latest/aws-security-incident-response-guide/welcome.html',
                  note: 'インシデント対応のベストプラクティス',
                  recommend: true,
                },
                {
                  title: 'AWS Shield Advanced ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/shield-chapter.html',
                  note: 'DDoS 保護とインシデント対応',
                },
              ],
            },
          ],
        },
        {
          id: '2.2',
          title: 'Respond to security events.',
          jpTitle: 'セキュリティイベントに対応する。',
          description: [
            'タスク 2.2: セキュリティイベントに対応する。',
            '- スキル 2.2.1: 関連するシステムログとアプリケーションログをフォレンジックアーティファクトとしてキャプチャし、保存する。',
            '- スキル 2.2.2: アプリケーションと AWS サービス全体のセキュリティイベントのログを検索し、関連付ける。',
            '- スキル 2.2.3: AWS のセキュリティサービスの検出結果を検証し、イベントの範囲と影響を評価する。',
            '- スキル 2.2.4: 脅威を封じ込めて根絶することにより、影響を受けたリソースに対応し、リソースを復旧する (ネットワーク封じ込めコントロールの実装、バックアップの復元など)。',
            '- スキル 2.2.5: 根本原因分析を行う方法を説明する (Amazon Detective など)。',
          ],
          knowledge: [
            'フォレンジック',
            'Amazon Detective',
            '脅威封じ込め',
            'ネットワーク封じ込めコントロール',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Detective ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/detective/latest/userguide/what-is-detective.html',
                  note: 'セキュリティ検出結果の根本原因分析',
                  recommend: true,
                },
                {
                  title: 'Amazon GuardDuty ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/guardduty/latest/ug/what-is-guardduty.html',
                  note: '脅威検出とイベントの特定',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 3,
      title: 'Infrastructure Security',
      jpTitle: 'インフラストラクチャのセキュリティ',
      weight: 18,
      color: '#22c55e',
      description: 'このドメインでは、ネットワークエッジサービスのセキュリティコントロール、コンピューティングワークロードのセキュリティコントロール、ネットワークセキュリティコントロールの設計・実装・トラブルシューティングに関するスキルと知識が問われます。',
      tasks: [
        {
          id: '3.1',
          title: 'Design, implement, and troubleshoot security controls for network edge services.',
          jpTitle: 'ネットワークエッジサービスのセキュリティコントロールを設計、実装、トラブルシューティングする。',
          description: [
            'タスク 3.1: ネットワークエッジサービスのセキュリティコントロールを設計、実装、トラブルシューティングする。',
            '- スキル 3.1.1: 予想される脅威と攻撃に基づいてエッジセキュリティ戦略を定義し、選択する。',
            '- スキル 3.1.2: 適切なネットワークエッジ保護を実装する [CloudFront ヘッダー、AWS WAF、AWS IoT ポリシー、OWASP Top 10 の脅威からの保護、Amazon S3 クロスオリジンリソース共有 (CORS)、Shield Advanced など]。',
            '- スキル 3.1.3: 要件に基づいて AWS エッジコントロールとルールを設計し、実装する (地理、位置情報、レート制限、クライアントフィンガープリントなど)。',
            '- スキル 3.1.4: AWS エッジサービスとサードパーティーサービスとの統合を設定する [Open Cybersecurity Schema Framework (OCSF) 形式のデータの取り込み、サードパーティーの WAF ルールの使用など]。',
          ],
          knowledge: [
            'Amazon CloudFront',
            'AWS WAF',
            'AWS Shield Advanced',
            'OWASP Top 10',
            'OCSF',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS WAF 開発者ガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/what-is-aws-waf.html',
                  note: 'Web アプリケーションファイアウォールの設定・ルール',
                  recommend: true,
                },
                {
                  title: 'AWS Shield Advanced ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/shield-chapter.html',
                  note: 'DDoS 保護の設計・実装',
                },
              ],
            },
          ],
        },
        {
          id: '3.2',
          title: 'Design, implement, and troubleshoot security controls for compute workloads.',
          jpTitle: 'コンピューティングワークロードのセキュリティコントロールを設計、実装、トラブルシューティングする。',
          description: [
            'タスク 3.2: コンピューティングワークロードのセキュリティコントロールを設計、実装、トラブルシューティングする。',
            '- スキル 3.2.1: コンピューティングワークロードを保護し、セキュリティコントロールを組み込むために、強化された Amazon EC2 AMI とコンテナイメージを設計し、実装する (Systems Manager、EC2 Image Builder など)。',
            '- スキル 3.2.2: コンピューティングワークロードを認可するために、インスタンスプロファイル、サービスロール、実行ロールを適切に適用する。',
            '- スキル 3.2.3: コンピューティングリソースに既知の脆弱性がないかスキャンする (Amazon Inspector を使用したコンテナイメージと Lambda 関数のスキャン、GuardDuty を使用したコンピューティングランタイムのモニタリングなど)。',
            '- スキル 3.2.4: 更新プロセスを自動化し、継続的な検証を統合することで、コンピューティングリソース全体にパッチをデプロイし、セキュアな準拠環境を維持する (Systems Manager Patch Manager、Amazon Inspector など)。',
            '- スキル 3.2.5: コンピューティングリソースへのセキュアな管理アクセスを設定する (Systems Manager Session Manager、EC2 Instance Connect など)。',
            '- スキル 3.2.6: パイプライン内の脆弱性を検出して修正するためのセキュリティツールを設定する (Amazon Q Developer、Amazon CodeGuru Security など)。',
            '- スキル 3.2.7: 生成 AI アプリケーションの保護とガードレールを実装する (GenAI OWASP Top 10 for LLM Applications 保護の適用など)。',
          ],
          knowledge: [
            'EC2 Image Builder',
            'Amazon Inspector',
            'Systems Manager Patch Manager',
            'Session Manager',
            'Amazon Q Developer',
            'Amazon GuardDuty',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Inspector ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/inspector/latest/user/what-is-inspector.html',
                  note: '脆弱性スキャン（EC2・コンテナ・ Lambda）',
                  recommend: true,
                },
                {
                  title: 'AWS Systems Manager Patch Manager',
                  url: 'https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/patch-manager.html',
                  note: 'パッチ管理の自動化',
                },
              ],
            },
          ],
        },
        {
          id: '3.3',
          title: 'Design and troubleshoot network security controls.',
          jpTitle: 'ネットワークセキュリティコントロールを設計し、トラブルシューティングする。',
          description: [
            'タスク 3.3: ネットワークセキュリティコントロールを設計し、トラブルシューティングする。',
            '- スキル 3.3.1: 必要に応じてネットワークトラフィックを許可または禁止するための適切なネットワークコントロールを設計し、トラブルシューティングする (セキュリティグループ、ネットワーク ACL、AWS Network Firewall など)。',
            '- スキル 3.3.2: ハイブリッドネットワークとマルチクラウドネットワークの間のセキュアな接続を設計する [AWS Site-to-Site VPN、AWS Direct Connect、MAC セキュリティ (MACsec) など]。',
            '- スキル 3.3.3: ハイブリッド環境と AWS の間の通信に関するセキュリティワークロード要件を判断し、設定する (AWS Verified Access の使用など)。',
            '- スキル 3.3.4: セキュリティ要件に基づいてネットワークセグメンテーションを設計する (north-south と east-west のトラフィック保護、分離されたサブネットなど)。',
            '- スキル 3.3.5: 不必要なネットワークアクセスを特定する (AWS Verified Access、Network Access Analyzer、Amazon Inspector のネットワーク到達可能性の検出結果など)。',
          ],
          knowledge: [
            'セキュリティグループ',
            'ネットワーク ACL',
            'AWS Network Firewall',
            'AWS Site-to-Site VPN',
            'AWS Direct Connect',
            'AWS Verified Access',
            'Network Access Analyzer',
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
                  note: 'ネットワークセグメンテーション・セキュリティグループ・ ACL',
                  recommend: true,
                },
                {
                  title: 'AWS Network Firewall 開発者ガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/network-firewall/latest/developerguide/what-is-aws-network-firewall.html',
                  note: 'VPC レベルのファイアウォールルール',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 4,
      title: 'Identity and Access Management',
      jpTitle: 'Identity and Access Management',
      weight: 20,
      color: '#a855f7',
      description: 'このドメインでは、認証戦略と認可戦略の設計・実装・トラブルシューティングに関するスキルと知識が問われます。',
      tasks: [
        {
          id: '4.1',
          title: 'Design, implement, and troubleshoot authentication strategies.',
          jpTitle: '認証戦略を設計、実装、トラブルシューティングする。',
          description: [
            'タスク 4.1: 認証戦略を設計、実装、トラブルシューティングする。',
            '- スキル 4.1.1: 人間、アプリケーション、システムの認証のためのアイデンティティソリューションを設計し、確立する [AWS IAM アイデンティティセンター、Amazon Cognito、多要素認証 (MFA)、ID プロバイダー (IdP) 統合など]。',
            '- スキル 4.1.2: 一時的な認証情報を発行するためのメカニズムを設定する [AWS Security Token Service (AWS STS)、Amazon S3 署名付き URL など]。',
            '- スキル 4.1.3: 認証に関する問題をトラブルシューティングする (CloudTrail、Amazon Cognito、IAM アイデンティティセンターのアクセス許可セット、AWS Directory Service など)。',
          ],
          knowledge: [
            'AWS IAM アイデンティティセンター',
            'Amazon Cognito',
            'MFA',
            'AWS STS',
            'AWS Directory Service',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS IAM Identity Center ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/singlesignon/latest/userguide/what-is.html',
                  note: 'マルチアカウントの ID フェデレーション',
                  recommend: true,
                },
                {
                  title: 'Amazon Cognito 開発者ガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/what-is-amazon-cognito.html',
                  note: 'アプリケーションの認証・ユーザー管理',
                },
              ],
            },
          ],
        },
        {
          id: '4.2',
          title: 'Design, implement, and troubleshoot authorization strategies.',
          jpTitle: '認可戦略を設計、実装、トラブルシューティングする。',
          description: [
            'タスク 4.2: 認可戦略を設計、実装、トラブルシューティングする。',
            '- スキル 4.2.1: 人間、アプリケーション、システムのアクセスのための認可コントロールを設計し、評価する (Amazon Verified Permissions、IAM パス、IAM Roles Anywhere、クロスアカウントアクセスのためのリソースポリシー、IAM ロール信頼ポリシーなど)。',
            '- スキル 4.2.2: 属性ベースのアクセス制御 (ABAC) 戦略およびロールベースのアクセス制御 (RBAC) 戦略を設計する (タグまたは属性に基づいたリソースアクセスの設定など)。',
            '- スキル 4.2.3: 最小権限の原則に従って IAM ポリシーを設計、解釈、実装する (アクセス許可境界、セッションポリシーなど)。',
            '- スキル 4.2.4: 認可障害を分析して原因または影響を判断する (IAM Policy Simulator、IAM Access Analyzer など)。',
            '- スキル 4.2.5: リソース、サービス、またはエンティティに付与された、意図しないアクセス許可、認可、または権限を調査し、修正する (IAM Access Analyzer など)。',
          ],
          knowledge: [
            'Amazon Verified Permissions',
            'IAM Roles Anywhere',
            'ABAC',
            'RBAC',
            'IAM Policy Simulator',
            'IAM Access Analyzer',
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
                  note: '最小権限・ ABAC/RBAC のベストプラクティス',
                  recommend: true,
                },
                {
                  title: 'IAM Access Analyzer ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/what-is-access-analyzer.html',
                  note: 'アクセス許可の分析・検証',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 5,
      title: 'Data Protection',
      jpTitle: 'データ保護',
      weight: 18,
      color: '#ef4444',
      description: 'このドメインでは、転送中のデータのコントロール、保管中のデータのコントロール、機密データ・認証情報・シークレット・暗号化キーマテリアルの保護に関するスキルと知識が問われます。',
      tasks: [
        {
          id: '5.1',
          title: 'Design and implement controls for data in transit.',
          jpTitle: '転送中のデータのコントロールを設計し、実装する。',
          description: [
            'タスク 5.1: 転送中のデータのコントロールを設計し、実装する。',
            '- スキル 5.1.1: リソースへの接続時に暗号化を義務付けるメカニズムを設計し、設定する [Elastic Load Balancing (ELB) セキュリティポリシーの設定、TLS 設定の強制適用など]。',
            '- スキル 5.1.2: リソースへのセキュアなプライベートアクセスのためのメカニズムを設計し、設定する (AWS PrivateLink、VPC エンドポイント、AWS Client VPN、AWS Verified Access など)。',
            '- スキル 5.1.3: 転送中のリソース間暗号化を設計し、設定する [Amazon EMR、Amazon Elastic Kubernetes Service (Amazon EKS)、SageMaker AI、Nitro 暗号化のためのノード間暗号化設定など]。',
          ],
          knowledge: [
            'ELB セキュリティポリシー',
            'TLS',
            'AWS PrivateLink',
            'VPC エンドポイント',
            'AWS Client VPN',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Certificate Manager ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/acm/latest/userguide/acm-overview.html',
                  note: 'SSL/TLS 証明書の管理・プロビジョニング',
                  recommend: true,
                },
                {
                  title: 'AWS PrivateLink ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/vpc/latest/privatelink/what-is-privatelink.html',
                  note: 'プライベート接続によるデータ保護',
                },
              ],
            },
          ],
        },
        {
          id: '5.2',
          title: 'Design and implement controls for data at rest.',
          jpTitle: '保管中のデータのコントロールを設計し、実装する。',
          description: [
            'タスク 5.2: 保管中のデータのコントロールを設計し、実装する。',
            '- スキル 5.2.1: 特定の要件に基づいて、保管中のデータ暗号化を設計、実装、設定する [AWS CloudHSM や AWS Key Management Service (AWS KMS) などの適切な暗号化キーサービスの選択、クライアント側の暗号化やサーバー側の暗号化などの適切な暗号化タイプの選択など]。',
            '- スキル 5.2.2: データの整合性を確保するためのメカニズムを設計し、設定する (S3 Object Lock、S3 Glacier Vault Lock、バージョニング、デジタルコード署名、ファイル検証など)。',
            '- スキル 5.2.3: データの自動ライフサイクル管理および保持ソリューションを設計する [S3 ライフサイクルポリシー、S3 Object Lock、Amazon Elastic File System (Amazon EFS) ライフサイクルポリシー、Amazon FSx for Lustre バックアップポリシーなど]。',
            '- スキル 5.2.4: セキュアなデータレプリケーションおよびバックアップソリューションを設計し、設定する (Amazon Data Lifecycle Manager、AWS Backup、ランサムウェア対策、AWS DataSync など)。',
          ],
          knowledge: [
            'AWS CloudHSM',
            'AWS KMS',
            'S3 Object Lock',
            'S3 Glacier Vault Lock',
            'AWS Backup',
            'AWS DataSync',
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
                  note: '保管中のデータの暗号化キー管理',
                  recommend: true,
                },
                {
                  title: 'AWS CloudHSM ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/cloudhsm/latest/userguide/introduction.html',
                  note: 'ハードウェアセキュリティモジュールによるキー管理',
                },
              ],
            },
          ],
        },
        {
          id: '5.3',
          title: 'Design and implement controls to protect sensitive data, credentials, secrets, and cryptographic key material.',
          jpTitle: '機密データ、認証情報、シークレット、暗号化キーマテリアルを保護するためのコントロールを設計し、実装する。',
          description: [
            'タスク 5.3: 機密データ、認証情報、シークレット、暗号化キーマテリアルを保護するためのコントロールを設計し、実装する。',
            '- スキル 5.3.1: 認証情報とシークレットの管理とローテーションを設計する (AWS Secrets Manager など)。',
            '- スキル 5.3.2: インポートされたキーマテリアルを管理し、使用する (インポートされたキーマテリアルの管理とローテーション、外部キーストアの管理と設定など)。',
            '- スキル 5.3.3: インポートされたキーマテリアルと AWS によって生成されたキーマテリアルの違いを説明する。',
            '- スキル 5.3.4: 機密データをマスクする [CloudWatch Logs データ保護ポリシー、Amazon Simple Notification Service (Amazon SNS) メッセージデータ保護など]。',
            '- スキル 5.3.5: 単一の AWS リージョンまたは複数のリージョンにわたる暗号化キーと証明書を作成し、管理する (AWS KMS カスタマーマネージド AWS KMS キー、AWS Private Certificate Authority など)。',
          ],
          knowledge: [
            'AWS Secrets Manager',
            'キーマテリアル',
            '外部キーストア',
            'AWS Private Certificate Authority',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Secrets Manager ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/secretsmanager/latest/userguide/intro.html',
                  note: 'シークレットの管理と自動ローテーション',
                  recommend: true,
                },
                {
                  title: 'AWS KMS 開発者ガイド — キーマテリアルのインポート',
                  url: 'https://docs.aws.amazon.com/ja_jp/kms/latest/developerguide/importing-keys.html',
                  note: 'キーマテリアルのインポートと管理',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 6,
      title: 'Security Foundations and Governance',
      jpTitle: 'セキュリティ基盤とガバナンス',
      weight: 14,
      color: '#06b6d4',
      description: 'このドメインでは、AWS アカウントの一元的なデプロイと管理、クラウドリソースのためのセキュアで一貫したデプロイ戦略、AWS リソースのコンプライアンス評価に関するスキルと知識が問われます。',
      tasks: [
        {
          id: '6.1',
          title: 'Develop a strategy for centrally deploying and managing AWS accounts.',
          jpTitle: 'AWS アカウントを一元的にデプロイして管理する戦略を策定する。',
          description: [
            'タスク 6.1: AWS アカウントを一元的にデプロイして管理する戦略を策定する。',
            '- スキル 6.1.1: AWS Organizations を使用して組織をデプロイし、設定する。',
            '- スキル 6.1.2: AWS Control Tower を新規および既存の環境に実装して管理し、オプションのカスタムコントロールをデプロイする。',
            '- スキル 6.1.3: アクセス許可を管理するための組織ポリシーを実装する (SCP、RCP、AI サービスオプトアウトポリシー、宣言型ポリシーなど)。',
            '- スキル 6.1.4: セキュリティサービスを一元管理する (委任管理者アカウントなど)。',
            '- スキル 6.1.5: AWS アカウントのルートユーザー認証情報を管理する (メンバーアカウントのルートアクセスの一元化、MFA の管理、ブレークグラス手順の設計など)。',
          ],
          knowledge: [
            'AWS Organizations',
            'AWS Control Tower',
            'SCP',
            'RCP',
            '委任管理者アカウント',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Organizations ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/organizations/latest/userguide/orgs_introduction.html',
                  note: 'マルチアカウントの一元管理と SCP',
                  recommend: true,
                },
                {
                  title: 'AWS Control Tower ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/controltower/latest/userguide/what-is-control-tower.html',
                  note: 'マルチアカウントのガバナンス・コントロール',
                },
              ],
            },
          ],
        },
        {
          id: '6.2',
          title: 'Implement a secure and consistent deployment strategy for cloud resources.',
          jpTitle: 'クラウドリソースのためのセキュアで一貫したデプロイ戦略を実装する。',
          description: [
            'タスク 6.2: クラウドリソースのためのセキュアで一貫したデプロイ戦略を実装する。',
            '- スキル 6.2.1: Infrastructure as Code を使用して、クラウドリソースをアカウント間で一貫したセキュアな方法でデプロイする (CloudFormation スタックセット、サードパーティーの IaC ツール、CloudFormation Guard、cfn-lint など)。',
            '- スキル 6.2.2: タグを使用して、AWS リソースを管理用のグループに整理する (部門、コストセンター、環境別のグループ化など)。',
            '- スキル 6.2.3: 中央のソースからポリシーと設定をデプロイし、強制適用する (AWS Firewall Manager など)。',
            '- スキル 6.2.4: AWS アカウント間でリソースをセキュアな方法で共有する [AWS Service Catalog、AWS Resource Access Manager (AWS RAM) など]。',
          ],
          knowledge: [
            'CloudFormation',
            'CloudFormation Guard',
            'AWS Firewall Manager',
            'AWS Service Catalog',
            'AWS RAM',
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
                  note: 'IaC によるセキュアなリソースデプロイ',
                  recommend: true,
                },
                {
                  title: 'AWS Firewall Manager ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/fms-chapter.html',
                  note: 'マルチアカウントのファイアウォールポリシー一元管理',
                },
              ],
            },
          ],
        },
        {
          id: '6.3',
          title: 'Evaluate the compliance of AWS resources.',
          jpTitle: 'AWS リソースのコンプライアンスを評価する。',
          description: [
            'タスク 6.3: AWS リソースのコンプライアンスを評価する。',
            '- スキル 6.3.1: 準拠していない AWS リソースを検出して修正し、通知を送信するためのルールを作成または有効にする (AWS Config を使用したアラートの集約と非準拠のリソースの修正、Security Hub など)。',
            '- スキル 6.3.2: AWS 監査サービスを使用してエビデンスを収集し、整理する (AWS Audit Manager、AWS Artifact など)。',
            '- スキル 6.3.3: AWS のサービスを使用して、アーキテクチャが AWS セキュリティのベストプラクティスに準拠しているかどうかを評価する (AWS Well-Architected フレームワークツールなど)。',
          ],
          knowledge: [
            'AWS Config',
            'AWS Security Hub',
            'AWS Audit Manager',
            'AWS Artifact',
            'AWS Well-Architected',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Config 開発者ガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/config/latest/developerguide/WhatIsConfig.html',
                  note: 'コンプライアンスルールの設定・自動修復',
                  recommend: true,
                },
                {
                  title: 'AWS Audit Manager ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/audit-manager/latest/userguide/what-is.html',
                  note: '監査エビデンスの収集・管理',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
