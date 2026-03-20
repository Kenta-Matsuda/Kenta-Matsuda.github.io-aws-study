export const AIP_C01 = {
  id: 'aip-c01',
  code: 'AIP-C01',
  shortLabel: 'AIP',
  title: 'AWS Certified Generative AI Developer - Professional',
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
              title: 'AWS Certified Generative AI Developer - Professional 公式ページ',
              url: 'https://aws.amazon.com/jp/certification/certified-generative-ai-developer-professional/',
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
              title: 'AWS Certified Generative AI Developer - Professional 試験ガイド (PDF)',
              url: 'https://d1.awsstatic.com/ja_JP/training-and-certification/docs-ai-professional/AWS-Certified-Generative-AI-Developer-Professional_Exam-Guide.pdf',
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
        'AWS Skill Builder の無料コースで、生成 AI 分野の基礎知識をインプットします。試験対策に特化したコースもあります。',
      ],
      resources: [
        {
          key: 'training',
          label: 'AWS トレーニング',
          iconClass: 'fas fa-chalkboard-teacher',
          iconColorClass: 'text-green-600',
          items: [
            {
              title: 'Exam Prep Standard Course: AWS Certified Generative AI Developer - Professional',
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/22657/exam-prep-standard-course-aws-certified-generative-ai-developer-professional-aip-c01',
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
        'Domain 1: 基盤モデルの統合、データ管理、コンプライアンス（31%）',
        'Domain 2: 実装と統合（26%）',
        'Domain 3: AI の安全性、セキュリティ、ガバナンス（20%）',
        'Domain 4: GenAI アプリケーションの運用効率と最適化（12%）',
        'Domain 5: テスト、検証、トラブルシューティング（11%）',
      ],
      resources: [
        {
          key: 'whitepapers',
          label: 'ホワイトペーパー・ガイド',
          iconClass: 'fas fa-file-alt',
          iconColorClass: 'text-gray-600',
          items: [
            {
              title: 'AWS Well-Architected Generative AI Lens',
              url: 'https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/generative-ai-lens/generative-ai-lens.html',
              note: '生成 AI ワークロードのベストプラクティス',
              recommend: true,
            },
            {
              title: 'Amazon Bedrock ユーザーガイド',
              url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/what-is-bedrock.html',
              note: 'Bedrock の包括的なリファレンス',
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
              url: 'https://explore.skillbuilder.aws/learn/course/internal/view/elearning/22654/aws-certified-generative-ai-developer-professional-official-practice-question-set-aip-c01-japanese',
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
      title: 'Foundation Model Integration, Data Management, and Compliance',
      jpTitle: '基盤モデルの統合、データ管理、コンプライアンス',
      weight: 31,
      color: '#3b82f6',
      description: 'このドメインでは、GenAI ソリューションの設計、FM の選定と設定、データ検証パイプライン、ベクトルストア、検索メカニズム、プロンプトエンジニアリング戦略に関するスキルが問われます。',
      tasks: [
        {
          id: '1.1',
          title: 'Analyze requirements and design GenAI solutions.',
          jpTitle: '要件を分析し、GenAI ソリューションを設計する。',
          description: [
            'タスク 1.1: 要件を分析し、GenAI ソリューションを設計する。',
            'スキル 1.1.1: 特定のビジネスニーズと技術的制約に沿った包括的なアーキテクチャ設計を作成する (適切な FM、統合パターン、デプロイ戦略の使用など)。',
            'スキル 1.1.2: 本格的なデプロイに進む前に概念実証の技術的実装を開発し、実現可能性、パフォーマンス特性、ビジネス価値を検証する (Amazon Bedrock の使用など)。',
            'スキル 1.1.3: 標準化された技術コンポーネントを作成し、複数のデプロイシナリオにわたって一貫した実装を確保する (AWS Well-Architected フレームワーク、AWS WA Tool Generative AI Lens の使用など)。',
          ],
          knowledge: [
            'Amazon Bedrock',
            'Well-Architected フレームワーク',
            'GenAI アーキテクチャ設計',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock ユーザーガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/what-is-bedrock.html',
                  note: 'GenAI ソリューションの設計と構築',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '1.2',
          title: 'Select and configure FMs.',
          jpTitle: 'FM を選定して設定する。',
          description: [
            'タスク 1.2: FM を選定して設定する。',
            'スキル 1.2.1: FM を評価して選定し、特定のビジネスユースケースや技術要件に沿って最適に調整する (パフォーマンスベンチマーク、能力分析、制限評価の使用など)。',
            'スキル 1.2.2: 柔軟なアーキテクチャパターンを作成し、コードを変更せずに動的なモデル選択とプロバイダーの切り替えができるようにする (AWS Lambda、Amazon API Gateway、AWS AppConfig の使用など)。',
            'スキル 1.2.3: 耐障害性の高い AI システムを設計し、サービス中断中も継続的に運用できるようにする (AWS Step Functions サーキットブレーカーパターン、リージョンの可用性が限られているモデルに対する Amazon Bedrock クロスリージョン推論、クロスリージョンモデルのデプロイ、グレースフルデグラデーション戦略の使用など)。',
            'スキル 1.2.4: FM カスタマイズデプロイとライフサイクル管理を実装する [Amazon SageMaker AI を使用したドメイン固有のファインチューニングされたモデルのデプロイ、モデルデプロイのための低ランク適応 (LoRA) やアダプターなどパラメータ効率の高い適応手法、SageMaker Model Registry を使用したバージョニングとカスタマイズ済みモデルのデプロイ、自動デプロイパイプラインを使用したモデルの更新、デプロイが失敗した場合のロールバック戦略、モデルの廃止と交換のためのライフサイクル管理の使用など]。',
          ],
          knowledge: [
            'Amazon Bedrock',
            'Amazon SageMaker AI',
            'LoRA',
            'モデルライフサイクル管理',
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
                  note: 'FM のファインチューニングとカスタマイズ',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '1.3',
          title: 'Implement data validation and processing pipelines for FM consumption.',
          jpTitle: 'FM 消費のためのデータ検証と処理パイプラインを実装する。',
          description: [
            'タスク 1.3: FM 消費のためのデータ検証と処理パイプラインを実装する。',
            'スキル 1.3.1: 包括的なデータ検証ワークフローを作成して、データが FM 消費の品質基準を満たしていることを確認する (AWS Glue Data Quality、SageMaker Data Wrangler、カスタム Lambda 関数、Amazon CloudWatch メトリクスの使用など)。',
            'スキル 1.3.2: テキスト、画像、音声、表形式データなどの複雑なデータタイプを、FM 消費に特化した処理要件に沿って処理するデータ処理ワークフローを作成する (Amazon Bedrock マルチモーダルモデル、SageMaker Processing、AWS Transcribe、高度なマルチモーダルパイプラインアーキテクチャの使用など)。',
            'スキル 1.3.3: モデル固有の要件に従って FM 推論用の入力データをフォーマットする (Amazon Bedrock API リクエストには JSON フォーマット、SageMaker AI エンドポイントには構造化データ前処理、ダイアログベースのアプリケーションには会話フォーマットの使用など)。',
            'スキル 1.3.4: 入力データの品質を高めて、FM の応答の品質と一貫性を向上させる (Amazon Bedrock を使用したテキストの再フォーマット、Amazon Comprehend を使用したエンティティの抽出、Lambda 関数を使用したデータの正規化など)。',
          ],
          knowledge: [
            'AWS Glue Data Quality',
            'SageMaker Data Wrangler',
            'Amazon Comprehend',
            'マルチモーダルデータ処理',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS Glue Data Quality',
                  url: 'https://docs.aws.amazon.com/ja_jp/glue/latest/dg/glue-data-quality.html',
                  note: 'データ検証パイプラインの構築',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '1.4',
          title: 'Design and implement vector store solutions.',
          jpTitle: 'ベクトルストアソリューションを設計して実装する。',
          description: [
            'タスク 1.4: ベクトルストアソリューションを設計して実装する。',
            'スキル 1.4.1: FM 拡張に特化した高度なベクトルデータベースアーキテクチャを作成し、従来の検索機能を超える効率的なセマンティック検索を有効にする (Amazon Bedrock ナレッジベースを使用した階層組織、Amazon OpenSearch Service と Amazon Bedrock 統合用 Neural プラグインを使用したトピックベースのセグメンテーション、Amazon RDS と Amazon S3 ドキュメントリポジトリ、Amazon DynamoDB とベクトルデータベースを使用したメタデータと埋め込みなど)。',
            'スキル 1.4.2: 包括的なメタデータフレームワークを開発して、検索の適合率と FM インタラクションのコンテキスト認識を向上させる (S3 オブジェクトメタデータを使用したドキュメントのタイムスタンプ、カスタム属性を使用した著者情報、タグシステムを使用したドメイン分類など)。',
            'スキル 1.4.3: 高パフォーマンスのベクトルデータベースアーキテクチャを実装して、FM 検索のセマンティック検索パフォーマンスを大規模に最適化する (OpenSearch シャーディング戦略、ドメインに特化したマルチインデックスアプローチ、階層型インデックス作成手法の使用など)。',
            'スキル 1.4.4: AWS のサービスを使用して、リソースに接続するための統合コンポーネントを作成する (ドキュメント管理システム、ナレッジベース、GenAI アプリケーションの包括的なデータ統合のための社内 Wiki など)。',
            'スキル 1.4.5: データ管理システムを設計してデプロイし、ベクトルストアに FM 拡張のための正確な最新情報が含まれるようにする (増分更新メカニズム、リアルタイム変更検出システム、自動同期ワークフロー、定期更新パイプラインの使用など)。',
          ],
          knowledge: [
            'Amazon Bedrock ナレッジベース',
            'Amazon OpenSearch Service',
            'ベクトルデータベース',
            'セマンティック検索',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock ナレッジベース',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/knowledge-base.html',
                  note: 'ベクトルストアとナレッジベースの構築',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '1.5',
          title: 'Design retrieval mechanisms for FM augmentation.',
          jpTitle: 'FM 拡張のための検索メカニズムを設計する。',
          description: [
            'タスク 1.5: FM 拡張のための検索メカニズムを設計する。',
            'スキル 1.5.1: 効果的なドキュメントセグメンテーションアプローチを開発し、FM コンテキスト拡張の検索パフォーマンスを最適化する (Amazon Bedrock チャンク機能、固定サイズのチャンクを実装する Lambda 関数、コンテンツ構造に基づく階層型チャンク用のカスタム処理の使用など)。',
            'スキル 1.5.2: 最適な埋め込みソリューションを選択して設定し、セマンティック検索のための効率的なベクトル表現を作成する (次元とドメインの適合性に基づく Amazon Titan 埋め込みの使用、Amazon Bedrock 埋め込みモデルのパフォーマンス特性の評価、埋め込みをバッチ生成する Lambda 関数の使用など)。',
            'スキル 1.5.3: ベクトル検索ソリューションをデプロイして設定し、FM 拡張のセマンティック検索機能を有効にする (ベクトル検索機能を備えた OpenSearch Service、pgvector 拡張を備えた Amazon Aurora、マネージドベクトルストア機能を備えた Amazon Bedrock ナレッジベースの使用など)。',
            'スキル 1.5.4: 高度な検索アーキテクチャを作成し、FM コンテキストに対して取得された情報の関連性と正解率を向上させる (OpenSearch を使用したセマンティック検索、キーワードとベクトルを組み合わせたハイブリッド検索、Amazon Bedrock reranker モデルの使用など)。',
            'スキル 1.5.5: 高度なクエリ処理システムを開発し、FM 拡張の検索効率と結果品質を向上させる (Amazon Bedrock を使用したクエリ拡張、Lambda 関数を使用したクエリ分解、Step Functions を使用したクエリ変換など)。',
            'スキル 1.5.6: 一貫性のあるアクセスメカニズムを作成し、FM とのシームレスな統合を有効にする [関数呼び出しインターフェイスを使用したベクトル検索、モデルコンテキストプロトコル (MCP) クライアントを使用したベクトルクエリ、標準化された API パターンを使用した検索拡張など]。',
          ],
          knowledge: [
            'RAG',
            'チャンク戦略',
            'Amazon Titan 埋め込み',
            'ハイブリッド検索',
            'MCP',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock での RAG 実装',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/knowledge-base-retrieve-generate.html',
                  note: '検索拡張生成 (RAG) の設計と実装',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '1.6',
          title: 'Implement prompt engineering strategies and governance for FM interactions.',
          jpTitle: 'FM インタラクションのためのプロンプトエンジニアリング戦略とガバナンスを実施する。',
          description: [
            'タスク 1.6: FM インタラクションのためのプロンプトエンジニアリング戦略とガバナンスを実施する。',
            'スキル 1.6.1: 効果的なモデル指示フレームワークを作成し、FM の挙動と出力を制御する (Amazon Bedrock Prompt Management を使用したロール定義の適用、Amazon Bedrock ガードレールを使用した責任ある AI ガイドラインの適用、テンプレート設定を使用した応答のフォーマットなど)。',
            'スキル 1.6.2: インタラクティブな AI システムを構築し、コンテキストを維持して FM とのユーザーインタラクションを改善する (Step Functions を使用した明確化ワークフロー、Amazon Comprehend を使用した意図認識、DynamoDB を使用した会話履歴ストレージなど)。',
            'スキル 1.6.3: 包括的なプロンプトマネジメントとガバナンスシステムを実装し、FM 運用の一貫性と監視を確保する (Amazon Bedrock Prompt Management を使用したパラメータ化テンプレートと承認ワークフローの作成、Amazon S3 を使用したテンプレートリポジトリの保存、AWS CloudTrail を使用した利用状況の追跡、Amazon CloudWatch Logs を使用したアクセスのログ記録など)。',
            'スキル 1.6.4: 品質保証システムを開発し、FM のプロンプトの有効性と信頼性を確保する (Lambda 関数を使用した期待される出力の検証、Step Functions を使用したエッジケースのテスト、CloudWatch を使用したプロンプト回帰のテストなど)。',
            'スキル 1.6.5: FM のパフォーマンスを強化して、基本のプロンプト手法を超えてプロンプトを繰り返し改良し、応答品質を改善する (構造化された入力コンポーネント、出力フォーマットの仕様、思考連鎖指示パターン、フィードバックループの使用など)。',
            'スキル 1.6.6: FM で高度なタスクを処理する複雑なプロンプトシステムを設計する (Amazon Bedrock Prompt Flows を使用した順次プロンプトチェーン、モデル応答に基づく条件分岐、再利用可能なプロンプトコンポーネント、統合された前処理と後処理のステップなど)。',
          ],
          knowledge: [
            'プロンプトエンジニアリング',
            'Amazon Bedrock Prompt Management',
            'Amazon Bedrock ガードレール',
            '思考連鎖',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock Prompt Management',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/prompt-management.html',
                  note: 'プロンプトテンプレートの作成と管理',
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
      title: 'Implementation and Integration',
      jpTitle: '実装と統合',
      weight: 26,
      color: '#f97316',
      description: 'このドメインでは、エージェンティック AI ソリューション、モデルデプロイ戦略、エンタープライズ統合、FM API 統合、アプリケーション統合パターンに関するスキルが問われます。',
      tasks: [
        {
          id: '2.1',
          title: 'Implement agentic AI solutions and tool integration.',
          jpTitle: 'エージェンティック AI ソリューションとツール統合を実装する。',
          description: [
            'タスク 2.1: エージェンティック AI ソリューションとツール統合を実装する。',
            'スキル 2.1.1: 適切なメモリとステート管理機能を備えたインテリジェントな自律システムを開発する (Strands Agents と AWS Agent Squad を使用したマルチエージェントシステム、MCP を使用したエージェントとツールのインタラクションなど)。',
            'スキル 2.1.2: 構造化された推論ステップに従って FM が複雑な問題を分解して解決できるようにする高度な問題解決システムを作成する (Step Functions を使用した ReAct パターンや思考連鎖推論アプローチの実装など)。',
            'スキル 2.1.3: FM の挙動の制御を確実にするために、保護された AI ワークフローを開発する (Step Functions を使用した停止条件の実装、Lambda 関数を使用したタイムアウトメカニズムの実装、IAM ポリシーを使用したリソース境界の適用、回路ブレーカーを使用した障害の軽減など)。',
            'スキル 2.1.4: 複数の機能にわたってパフォーマンスを最適化する高度なモデル調整システムを作成する (特化型 FM を使用した複雑なタスクの実行、モデルアンサンブルのためのカスタム集計ロジック、モデル選択フレームワークの使用など)。',
            'スキル 2.1.5: 人間の専門知識を活用して FM 機能を強化するコラボレーション AI システムを開発する (Step Functions を使用したレビューと承認プロセスのオーケストレーション、API Gateway を使用したフィードバック収集メカニズムの実装、人間の拡張パターンの使用など)。',
            'スキル 2.1.6: FM 機能を拡張し、信頼性の高いツール運用を実現するためのインテリジェントツール統合を実装する (Strands API を使用したカスタム挙動の実装、標準化された関数定義、Lambda 関数を使用したエラー処理とパラメータ検証の実装など)。',
            'スキル 2.1.7: FM 機能を強化するモデル拡張フレームワークを開発する (Lambda 関数を使用した、軽量なツールアクセスを提供するステートレス MCP サーバーの実装、Amazon ECS を使用した、複雑なツールを提供する MCP サーバーの実装、MCP クライアントライブラリを使用した一貫性のあるアクセスパターンの確保など)。',
          ],
          knowledge: [
            'エージェンティック AI',
            'MCP',
            'ReAct パターン',
            'マルチエージェントシステム',
            'Strands Agents',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock Agents',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/agents.html',
                  note: 'エージェンティック AI の構築とツール統合',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '2.2',
          title: 'Implement model deployment strategies.',
          jpTitle: 'モデルデプロイ戦略を実施する。',
          description: [
            'タスク 2.2: モデルデプロイ戦略を実施する。',
            'スキル 2.2.1: 特定のアプリケーションニーズとパフォーマンス要件に基づいて FM をデプロイする (Lambda 関数を使用したオンデマンド呼び出し、Amazon Bedrock プロビジョンドスループット設定、SageMaker AI エンドポイントを使用したハイブリッドソリューションの実装など)。',
            'スキル 2.2.2: 従来の ML デプロイとは異なる大規模言語モデル (LLM) 特有の課題に対処することで FM ソリューションをデプロイする (メモリ要件、GPU 使用率、トークン処理容量について最適化されたコンテナベースのデプロイパターンの実装、特化型のモデルロード戦略の遵守など)。',
            'スキル 2.2.3: GenAI ワークロードのパフォーマンスとリソース要件のバランスを取るように最適化された FM デプロイアプローチを策定する (適切なモデルの選択、特定のタスク向けに事前トレーニングされた小規模なモデルの使用、ルーチンクエリ実行のための API ベースのモデルカスケードの使用など)。',
          ],
          knowledge: [
            'Amazon Bedrock プロビジョンドスループット',
            'SageMaker AI エンドポイント',
            'LLM デプロイ',
            'モデルカスケード',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock プロビジョンドスループット',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/prov-throughput.html',
                  note: 'モデルデプロイとスループットの管理',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '2.3',
          title: 'Design and implement enterprise integration architectures.',
          jpTitle: 'エンタープライズ統合アーキテクチャを設計し実装する。',
          description: [
            'タスク 2.3: エンタープライズ統合アーキテクチャを設計し実装する。',
            'スキル 2.3.1: FM 機能を既存のエンタープライズ環境にシームレスに組み込むエンタープライズ接続ソリューションを作成する (レガシーシステムとの API ベースの統合、疎結合を実装するイベント駆動型アーキテクチャ、データ同期パターンの使用など)。',
            'スキル 2.3.2: 既存のアプリケーションを GenAI 機能で強化する統合 AI 機能を開発する (API Gateway を使用したマイクロサービス統合の実装、Lambda 関数を使用したウェブフックハンドラー、Amazon EventBridge を使用したイベント駆動型統合の実装など)。',
            'スキル 2.3.3: 適切なセキュリティコントロールを確保するセキュアなアクセスフレームワークを作成する (FM サービスとエンタープライズシステム間の ID フェデレーション、モデルおよびデータアクセスに対するロールベースのアクセスコントロール、FM への最小権限の API アクセスの使用など)。',
            'スキル 2.3.4: FM へのアクセスを有効にするとともに管轄区域を横断したデータコンプライアンスを確保する環境横断型 AI ソリューションを開発する (AWS Outposts を使用したオンプレミスデータ統合、AWS Wavelength を使用したエッジデプロイの実行、クラウドとオンプレミスのリソース間のセキュアなルーティングの使用など)。',
            'スキル 2.3.5: エンタープライズ環境にセキュアで規制に準拠した消費パターンを実装するための CI/CD パイプラインと GenAI ゲートウェイアーキテクチャを実装する (AWS CodePipeline、AWS CodeBuild、GenAI コンポーネントの継続的デプロイとテストのためのセキュリティスキャンとロールバックをサポートする自動テストフレームワーク、一元化された抽象化レイヤー、オブザーバビリティと制御メカニズムの使用など)。',
          ],
          knowledge: [
            'API Gateway',
            'Amazon EventBridge',
            'CI/CD パイプライン',
            'エンタープライズ統合',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon API Gateway 開発者ガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/welcome.html',
                  note: 'API 統合とエンタープライズ接続',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '2.4',
          title: 'Implement FM API integrations.',
          jpTitle: 'FM API 統合を実装する。',
          description: [
            'タスク 2.4: FM API 統合を実装する。',
            'スキル 2.4.1: 柔軟なモデルインタラクションシステムを作成する (Amazon Bedrock API を使用した、さまざまなコンピューティング環境からの同期リクエストの管理、言語固有の AWS SDK と Amazon SQS を使用した非同期処理、API Gateway を使用したカスタム API クライアントへのリクエスト検証の提供など)。',
            'スキル 2.4.2: FM から即時フィードバックを提供するリアルタイム AI インタラクションシステムを開発する (Amazon Bedrock ストリーミング API を使用した増分応答配信、WebSocket またはサーバー送信イベントを使用したテキストのリアルタイム生成、API Gateway を使用したチャンク転送エンコーディングの実装など)。',
            'スキル 2.4.3: 信頼性の高い運用を確保するための耐障害性の高い FM システムを作成する (AWS SDK を使用したエクスポネンシャルバックオフ、API Gateway を使用したレート制限の管理、グレースフルデグラデーションのためのフォールバックメカニズム、AWS X-Ray を使用したサービス境界をまたぐオブザーバビリティの提供など)。',
            'スキル 2.4.4: モデル選択を最適化するインテリジェントなモデルルーティングシステムを開発する (アプリケーションコードを使用した静的ルーティング構成の実装、Step Functions を使用した特化型 FM への動的コンテンツベースのルーティング、メトリクスに基づいたインテリジェントなモデルルーティング、API Gateway とリクエスト変換を使用したルーティングロジック)。',
          ],
          knowledge: [
            'Amazon Bedrock API',
            'ストリーミング応答',
            'AWS X-Ray',
            'モデルルーティング',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock API リファレンス',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/APIReference/welcome.html',
                  note: 'Bedrock API の呼び出しとストリーミング',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '2.5',
          title: 'Implement application integration patterns and development tools.',
          jpTitle: 'アプリケーション統合パターンと開発ツールを実装する。',
          description: [
            'タスク 2.5: アプリケーション統合パターンと開発ツールを実装する。',
            'スキル 2.5.1: GenAI ワークロードの特定の要件に対応する FM API インターフェイスを作成する (API Gateway を使用したストリーミング応答への対処、トークンの制限管理、再試行戦略を使用したモデルタイムアウトへの対処など)。',
            'スキル 2.5.2: FM の採用と統合を促進するために、アクセシブルな AI インターフェイスを開発する (AWS Amplify を使用した宣言型 UI コンポーネントの開発、OpenAPI 仕様を使用した API ファースト開発アプローチ、Amazon Bedrock Prompt Flows を使用したノーコードワークフロービルダーなど)。',
            'スキル 2.5.3: ビジネスシステムの機能強化を作成する [Lambda 関数を使用した顧客関係管理 (CRM) の機能強化の実装、Step Functions を使用したドキュメント処理システムのオーケストレーション、Amazon Q Business データソースを使用した社内ナレッジツールの提供、Amazon Bedrock Data Automation を使用した自動データ処理ワークフローの管理など]。',
            'スキル 2.5.4: GenAI アプリケーションの開発ワークフローを加速させるためにデベロッパーの生産性を高める (Amazon Q Developer を使用したコードの生成とリファクタリング、API アシスタンスのコード提案、AI コンポーネントテスト、パフォーマンスの最適化の使用など)。',
            'スキル 2.5.5: 高度な AI 機能を実装する高度な GenAI アプリケーションを開発する (Strands Agents と AWS Agent Squad を使用した AWS ネイティブオーケストレーション、Step Functions を使用したエージェント設計パターンのオーケストレーション、Amazon Bedrock を使用したプロンプトチェーンパターンの管理など)。',
            'スキル 2.5.6: FM アプリケーションのトラブルシューティング効率を向上させる (CloudWatch Logs Insights を使用したプロンプトと応答の分析、X-Ray を使用した FM API コールのトレース、Amazon Q Developer を使用した GenAI 固有のエラーパターン認識の実装など)。',
          ],
          knowledge: [
            'AWS Amplify',
            'Amazon Q Developer',
            'Amazon Q Business',
            'Amazon Bedrock Prompt Flows',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Q Developer',
                  url: 'https://docs.aws.amazon.com/ja_jp/amazonq/latest/qdeveloper-ug/what-is.html',
                  note: 'AI コーディングアシスタントの活用',
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
      title: 'AI Safety, Security, and Governance',
      jpTitle: 'AI の安全性、セキュリティ、ガバナンス',
      weight: 20,
      color: '#22c55e',
      description: 'このドメインでは、入力・出力の安全コントロール、データセキュリティとプライバシー、AI ガバナンスとコンプライアンス、責任ある AI の原則に関するスキルが問われます。',
      tasks: [
        {
          id: '3.1',
          title: 'Implement input and output safety controls.',
          jpTitle: '入力と出力の安全コントロールを実装する。',
          description: [
            'タスク 3.1: 入力と出力の安全コントロールを実装する。',
            'スキル 3.1.1: FM への有害なユーザー入力を防ぐ包括的なコンテンツ安全システムを開発する (Amazon Bedrock ガードレールを使用したコンテンツのフィルタリング、Step Functions と Lambda 関数を使用したカスタムモデレーションワークフローの実装、リアルタイム検証メカニズムの使用など)。',
            'スキル 3.1.2: 有害な出力を防ぐコンテンツ安全フレームワークを作成する (Amazon Bedrock ガードレールを使用した応答のフィルタリング、コンテンツモデレーションと毒性検出に特化した FM 評価、Text-to-SQL 変換を使用した決定論的な結果の確保など)。',
            'スキル 3.1.3: FM 応答のハルシネーションを低減するために、正解率検証システムを開発する (Amazon Bedrock ナレッジベースを使用した根拠のある応答の生成とファクトチェックの実行、信頼度スコアリングとセマンティック類似性検索、JSON スキーマを使用した構造化出力の提供など)。',
            'スキル 3.1.4: FM の誤用に対する包括的な保護を提供する多層防御安全システムを作成する (Amazon Comprehend を使用した前処理フィルターの開発、Amazon Bedrock を使用したモデルベースのガードレールの実装、Lambda 関数を使用した後処理検証の実行、API Gateway を使用した API 応答フィルタリングの実装など)。',
            'スキル 3.1.5: 敵対的な入力やセキュリティの脆弱性から保護する高度な脅威検出を実装する (プロンプトインジェクションとジェイルブレイクの検出メカニズム、入力サニタイズとコンテンツフィルター、安全分類ツール、自動化された敵対的テストワークフローの使用など)。',
          ],
          knowledge: [
            'Amazon Bedrock ガードレール',
            'ハルシネーション対策',
            'プロンプトインジェクション防御',
            'コンテンツモデレーション',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock ガードレール',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/guardrails.html',
                  note: '入出力の安全コントロールとコンテンツフィルタリング',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.2',
          title: 'Implement data security and privacy controls.',
          jpTitle: 'データセキュリティとプライバシーコントロールを実装する。',
          description: [
            'タスク 3.2: データセキュリティとプライバシーコントロールを実装する。',
            'スキル 3.2.1: FM デプロイの包括的なセキュリティを確保する、保護された AI 環境を開発する (VPC エンドポイントを使用したネットワーク分離、IAM ポリシーを使用したセキュアなデータアクセスパターンの適用、AWS Lake Formation を使用したきめ細かいデータアクセスの提供、CloudWatch を使用したデータアクセスのモニタリングなど)。',
            'スキル 3.2.2: FM インタラクション中に機密情報を保護するプライバシー保護システムを開発する [Amazon Comprehend と Amazon Macie を使用した個人を特定できる情報 (PII) の検出、Amazon Bedrock のネイティブデータプライバシー機能の使用、Amazon Bedrock ガードレールを使用した出力のフィルタリング、Amazon S3 ライフサイクル設定を使用したデータ保持ポリシーの実装など]。',
            'スキル 3.2.3: FM の有用性と有効性を維持しながらユーザーのプライバシーを保護する、プライバシー保護に重点を置いた AI システムを作成する (データマスキング手法、Amazon Comprehend の PII 検出、機密情報の匿名化戦略、Amazon Bedrock ガードレールの使用など)。',
          ],
          knowledge: [
            'VPC エンドポイント',
            'AWS Lake Formation',
            'Amazon Macie',
            'PII 検出',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock のセキュリティ',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/security.html',
                  note: 'データセキュリティとプライバシー保護',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.3',
          title: 'Implement AI governance and compliance mechanisms.',
          jpTitle: 'AI ガバナンスとコンプライアンスのメカニズムを実装する。',
          description: [
            'タスク 3.3: AI ガバナンスとコンプライアンスのメカニズムを実装する。',
            'スキル 3.3.1: FM デプロイの規制コンプライアンスを確保するコンプライアンスフレームワークを開発する (SageMaker AI を使用したプログラムによるモデルカード開発、AWS Glue を使用したデータリネージュの自動追跡、体系的なデータソース帰属のためのメタデータのタグ付け、CloudWatch Logs を使用した包括的な意思決定ログの収集など)。',
            'スキル 3.3.2: GenAI アプリケーションのトレーサビリティを維持するデータソース追跡を実装する (AWS Glue Data Catalog を使用したデータソース登録、FM 生成コンテンツのソース帰属のためのメタデータのタグ付け、CloudTrail を使用した監査ロギングなど)。',
            'スキル 3.3.3: FM の実装を一貫して監視するために、組織ガバナンスシステムを構築する (組織のポリシー、規制要件、責任ある AI の原則に沿った包括的なフレームワークの使用など)。',
            'スキル 3.3.4: 安全監査と規制への準備をサポートする継続的なモニタリングと高度なガバナンスコントロールを実装する (誤用、ドリフト、ポリシー違反の自動検出、バイアスドリフトモニタリング、自動アラートと修復ワークフロー、トークンレベルのリダクション、応答ロギング、AI 出力ポリシーフィルターの使用など)。',
          ],
          knowledge: [
            'モデルカード',
            'AWS Glue Data Catalog',
            'データリネージュ',
            'コンプライアンスフレームワーク',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock モデル呼び出しログ',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/model-invocation-logging.html',
                  note: '監査ログとコンプライアンスモニタリング',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '3.4',
          title: 'Implement responsible AI principles.',
          jpTitle: '責任ある AI の原則を実装する。',
          description: [
            'タスク 3.4: 責任ある AI の原則を実装する。',
            'スキル 3.4.1: FM 出力での透明性の高い AI システムを開発する (推論表示を使用したユーザー向け説明の提供、CloudWatch を使用した信頼度メトリクスの収集と不確実性の数値化、ソース帰属のエビデンス提示、Amazon Bedrock エージェントトレースを使用した推論トレースの提供など)。',
            'スキル 3.4.2: バイアスのない FM 出力を確保する公平性評価を適用する (CloudWatch、Amazon Bedrock Prompt Management、Amazon Bedrock Prompt Flows で事前定義された公平性メトリクスを使用した体系的な A/B テストの実行、Amazon Bedrock で LLM-as-a-judge ソリューションを使用した自動モデル評価の実行など)。',
            'スキル 3.4.3: 責任ある AI プラクティスを遵守するためのポリシー準拠 AI システムを開発する (ポリシー要件に基づく Amazon Bedrock ガードレールの使用、モデルカードを使用した FM の制限のドキュメント化、Lambda 関数を使用した自動コンプライアンスチェックの実行など)。',
          ],
          knowledge: [
            '責任ある AI',
            'バイアス検出',
            'LLM-as-a-judge',
            '公平性メトリクス',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS 責任ある AI',
                  url: 'https://aws.amazon.com/jp/ai/responsible-ai/',
                  note: 'AWS の責任ある AI の原則と実践',
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
      title: 'Operational Efficiency and Optimization of GenAI Applications',
      jpTitle: 'GenAI アプリケーションの運用効率と最適化',
      weight: 12,
      color: '#a855f7',
      description: 'このドメインでは、コスト最適化、アプリケーションパフォーマンスの最適化、モニタリングシステムの実装に関するスキルが問われます。',
      tasks: [
        {
          id: '4.1',
          title: 'Implement cost optimization and resource efficiency strategies.',
          jpTitle: 'コスト最適化とリソース効率化の戦略を実施する。',
          description: [
            'タスク 4.1: コスト最適化とリソース効率化の戦略を実施する。',
            'スキル 4.1.1: 有効性を維持しながら FM コストを削減するトークン効率システムを開発する (トークンの推定と追跡、コンテキストウィンドウの最適化、応答サイズのコントロール、プロンプト圧縮、コンテキストプルーニング、応答制限の使用など)。',
            'スキル 4.1.2: コスト効率の高いモデル選択フレームワークを作成する (コスト能力のトレードオフ評価、クエリの複雑さに基づく階層化された FM、応答品質に対する推論コストバランシング、価格対性能比の測定、効率的な推論パターンの使用など)。',
            'スキル 4.1.3: GenAI ワークロードのリソース利用とスループットを最大化する高パフォーマンス FM システムを開発する (バッチ戦略、容量プランニング、使用率モニタリング、Auto Scaling 構成、プロビジョンドスループット最適化の使用など)。',
            'スキル 4.1.4: 不必要な FM 呼び出しを回避することでコストを削減して応答時間を改善するインテリジェントなキャッシュシステムを作成する (セマンティックキャッシュ、結果フィンガープリンティング、エッジキャッシュ、決定論的リクエストハッシュ、プロンプトキャッシュの使用など)。',
          ],
          knowledge: [
            'トークン最適化',
            'プロビジョンドスループット',
            'セマンティックキャッシュ',
            'コスト最適化',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'Amazon Bedrock の料金',
                  url: 'https://aws.amazon.com/jp/bedrock/pricing/',
                  note: 'トークン価格とコスト最適化の理解',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '4.2',
          title: 'Optimize application performance.',
          jpTitle: 'アプリケーションのパフォーマンスを最適化する。',
          description: [
            'タスク 4.2: アプリケーションのパフォーマンスを最適化する。',
            'スキル 4.2.1: レイテンシーとコストのトレードオフに対処し FM に関するユーザーエクスペリエンスを向上させる即応型 AI システムを作成する (事前計算を使用した予測可能なクエリの実行、時間的制約のあるアプリケーション向けのレイテンシーが最適化された Amazon Bedrock モデル、複雑なワークフローに対する並列リクエスト、応答ストリーミング、パフォーマンスベンチマークの使用など)。',
            'スキル 4.2.2: FM コンテキスト拡張の検索対象情報の関連性と処理速度を向上させるように検索パフォーマンスを強化する (インデックス最適化、クエリの前処理、カスタムスコアリングによるハイブリッド検索実装の使用など)。',
            'スキル 4.2.3: GenAI ワークロード固有のスループットの課題に対処するように FM スループット最適化を実装する (トークン処理最適化、バッチ推論戦略、同時モデル呼び出し管理の使用など)。',
            'スキル 4.2.4: 特定の GenAI ユースケースで最適な結果が得られるように FM パフォーマンスを強化する (モデル固有のパラメータ構成の使用、A/B テストを使用した改善点の評価、要件に基づく適切な温度と top-k/top-p 選択の使用など)。',
            'スキル 4.2.5: FM ワークロードに特化した効率的なリソース割り当てシステムを作成する (トークン処理要件に対する容量プランニング、プロンプトパターンと完成パターンに対する使用率モニタリング、GenAI トラフィックパターン向けに最適化された Auto Scaling 構成の使用など)。',
            'スキル 4.2.6: GenAI ワークフロー向けに FM システムのパフォーマンスを最適化する (API コールプロファイリングを使用したプロンプト-完成パターン、ベクトルデータベースクエリ最適化を使用した検索拡張、LLM 推論固有のレイテンシー削減手法、効率的なサービスコミュニケーションパターンの使用など)。',
          ],
          knowledge: [
            'レイテンシー最適化',
            'バッチ推論',
            'Temperature / top-k / top-p',
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
                  title: 'Amazon Bedrock 推論パラメータ',
                  url: 'https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/inference-parameters.html',
                  note: 'Temperature ・ top-k ・ top-p の最適化',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '4.3',
          title: 'Implement monitoring systems for GenAI applications.',
          jpTitle: 'GenAI アプリケーションのモニタリングシステムを実装する。',
          description: [
            'タスク 4.3: GenAI アプリケーションのモニタリングシステムを実装する。',
            'スキル 4.3.1: FM アプリケーションのパフォーマンスを完全に可視化する包括的なオブザーバビリティシステムを作成する (運用メトリクス、パフォーマンストレース、FM インタラクショントレース、カスタムダッシュボードでのビジネスインパクトメトリクスの使用など)。',
            'スキル 4.3.2: 問題を事前に特定し FM 実装に固有の重要業績評価指標を評価するための包括的な GenAI モニタリングシステムを実装する (CloudWatch を使用したトークンの使用状況、プロンプトの有効性、ハルシネーション率、応答品質・トークンのバーストパターンと応答ドリフトの異常検出・Amazon Bedrock のモデル呼び出しログを使用した詳細なリクエストおよび応答分析の実行・パフォーマンスベンチマーク・コスト異常検出の使用など)。',
            'スキル 4.3.3: FM アプリケーションに実用的なインサイトを提供する統合オブザーバビリティソリューションを開発する (運用メトリクスダッシュボード、ビジネスインパクト視覚化、コンプライアンスモニタリング、フォレンジックトレーサビリティと監査ロギング、ユーザーインタラクション追跡、モデル挙動パターン追跡の使用など)。',
            'スキル 4.3.4: FM に最適なツール運用と利用を確保するために、ツールパフォーマンスフレームワークを作成する (コールパターン追跡、パフォーマンスメトリクス収集、ツールコールのオブザーバビリティ、マルチエージェントコーディネーション追跡、異常検知のための利用状況ベースラインの使用など)。',
            'スキル 4.3.5: ベクトルストアの最適な運用と FM 拡張の信頼性を確保するベクトルストア運用管理システムを作成する (ベクトルデータベースのパフォーマンスモニタリング、自動インデックス最適化ルーチン、データ品質検証プロセスの使用など)。',
            'スキル 4.3.6: 従来の ML システムにない GenAI 固有の障害モードを特定する FM 固有のトラブルシューティングフレームワークを開発する (ゴールデンデータセットを使用したハルシネーションの検出、出力差分手法を使用した応答一貫性分析の実施、推論パストレースを使用した論理エラーの特定、特化型のオブザーバビリティパイプラインの使用など)。',
          ],
          knowledge: [
            'オブザーバビリティ',
            'Amazon CloudWatch',
            'モデル呼び出しログ',
            '異常検出',
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
                  note: 'GenAI アプリケーションのモニタリング',
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
      title: 'Testing, Validation, and Troubleshooting',
      jpTitle: 'テスト、検証、トラブルシューティング',
      weight: 11,
      color: '#ef4444',
      description: 'このドメインでは、GenAI の評価システムの実装と、GenAI アプリケーションのトラブルシューティングに関するスキルが問われます。',
      tasks: [
        {
          id: '5.1',
          title: 'Implement GenAI evaluation systems.',
          jpTitle: 'GenAI の評価システムを実装する。',
          description: [
            'タスク 5.1: GenAI の評価システムを実装する。',
            'スキル 5.1.1: 従来の ML 評価アプローチを超えて FM 出力の品質と有効性を評価する包括的な評価フレームワークを開発する (関連性、事実に関する正解率、一貫性、流暢さのメトリクスの使用など)。',
            'スキル 5.1.2: 最適な構成を特定するための体系的なモデル評価システムを作成する (Amazon Bedrock モデル評価、FM の A/B テストと Canary テスト、マルチモデル評価、トークンの効率、レイテンシーと品質の比率、ビジネス成果を測定するためのコストパフォーマンス分析の使用など)。',
            'スキル 5.1.3: ユーザーエクスペリエンスに基づいて FM パフォーマンスを継続的に改善するためのユーザー中心の評価メカニズムを開発する (フィードバックインターフェイス、モデル出力の評価システム、応答品質を評価するアノテーションワークフローの使用など)。',
            'スキル 5.1.4: FM の一貫したパフォーマンス基準を維持するための体系的な品質保証プロセスを作成する (継続的評価のワークフロー、モデル出力の回帰テスト、デプロイの自動品質ゲートの使用など)。',
            'スキル 5.1.5: FM 出力をさまざまな視点から徹底的に評価する包括的な評価システムを開発する (RAG 評価、LLM-as-a-judge 手法による自動品質評価、人間のフィードバック収集インターフェイスの使用など)。',
            'スキル 5.1.6: FM 拡張のための情報検索コンポーネントを評価および最適化するための検索品質テストを実装する (関連性スコアリング、コンテキストマッチング検証、検索レイテンシー測定の使用など)。',
            'スキル 5.1.7: エージェントがタスクを正確かつ効率的に実行できるようにするためのエージェントパフォーマンスフレームワークを開発する (タスク完了率の測定、ツールの使用効率の評価、Amazon Bedrock エージェントの評価、マルチステップワークフローにおける推論品質評価の使用など)。',
            'スキル 5.1.8: FM 実装のパフォーマンスメトリクスとインサイトをステークホルダーに効果的に伝えるための包括的なレポートシステムを作成する (視覚化ツール、自動レポートメカニズム、モデル比較の視覚化の使用など)。',
            'スキル 5.1.9: FM 更新中に信頼性を維持するためのデプロイ検証システムを作成する (合成ユーザーワークフロー、ハルシネーション率とセマンティックドリフトに関する AI 固有の出力の検証、応答の一貫性を確保するための自動品質チェックの使用など)。',
          ],
          knowledge: [
            'Amazon Bedrock モデル評価',
            'RAG 評価',
            'A/B テスト',
            '回帰テスト',
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
                  note: 'FM の品質評価とベンチマーク',
                  recommend: true,
                },
              ],
            },
          ],
        },
        {
          id: '5.2',
          title: 'Troubleshoot GenAI applications.',
          jpTitle: 'GenAI アプリケーションをトラブルシューティングする。',
          description: [
            'タスク 5.2: GenAI アプリケーションをトラブルシューティングする。',
            'スキル 5.2.1: 必要な情報が FM インタラクションで完全に処理されるようにするためにコンテンツ処理の問題を解決する (コンテキストウィンドウのオーバーフロー診断、動的チャンク戦略、プロンプト設計の最適化、切り捨て関連のエラー分析の使用など)。',
            'スキル 5.2.2: FM 統合の問題を診断して解決し、GenAI サービスに固有の API 統合の問題を特定して修正する (エラーロギング、リクエスト検証、応答分析の使用など)。',
            'スキル 5.2.3: 基本的なプロンプト調整を超えて FM 応答の品質と一貫性を向上させるために、プロンプトエンジニアリングの問題をトラブルシューティングする (プロンプトテストフレームワーク、バージョン比較、体系的な改良の使用など)。',
            'スキル 5.2.4: FM 拡張のための情報検索の有効性に影響する問題を特定して解決するために、検索システムの問題をトラブルシューティングする (モデル応答関連性分析、埋め込み品質診断、ドリフトモニタリング、ベクトル化問題の解決、チャンク化と前処理の修復、ベクトル検索パフォーマンスの最適化の使用など)。',
            'スキル 5.2.5: FM インタラクションのパフォーマンスを継続的に改善するために、プロンプトメンテナンスの問題をトラブルシューティングする (テンプレートテストと CloudWatch Logs を使用したプロンプト混乱の診断、X-Ray を使用したプロンプトオブザーバビリティパイプラインの実装、スキーマ検証を使用したフォーマットの不一致の検出、体系的なプロンプト改良ワークフローの使用など)。',
          ],
          knowledge: [
            'コンテキストウィンドウ',
            'API 統合トラブルシューティング',
            '埋め込み品質診断',
            'プロンプトオブザーバビリティ',
          ],
          resources: [
            {
              key: 'docs',
              label: '公式ドキュメント',
              iconClass: 'fas fa-book-open',
              iconColorClass: 'text-blue-600',
              items: [
                {
                  title: 'AWS X-Ray 開発者ガイド',
                  url: 'https://docs.aws.amazon.com/ja_jp/xray/latest/devguide/aws-xray.html',
                  note: 'GenAI アプリケーションのトレーシングとデバッグ',
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
