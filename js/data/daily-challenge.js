/**
 * Daily Challenge — API キー不要のデイリークイズ (issue #34)
 *
 * このモジュールは事前に用意した CLF レベル（基礎）の AWS 選択問題プールを持ち、
 * ローカル日付を種にした決定的な選択で「1日5問」を返します。AI プロバイダーや
 * API キーを一切必要とせず、クライアントサイドのみで完結します。
 *
 * 各問題は他の js/data/*.js と同じ jp/en フィールドサフィックス規約に従い、
 * 日本語(question/choices/explanation)と英語(questionEn/choicesEn/explanationEn)の
 * 両方を持ちます。getDailyChallengeQuestions() が locale に応じて正規化された
 * レンダラー形状 { question, choices, correctIndex, explanation } を返します。
 *
 * 注: 選択肢は 'A. ' 形式のラベル付き文字列（js/quiz.js の normalizeQuizObject と同じ）。
 * すべての問題は ja / en 両方を完全収録しています（en の欠落なし）。
 */

export const DAILY_CHALLENGE_QUESTIONS = [
  {
    question: 'AWSの「リージョン」と「アベイラビリティーゾーン(AZ)」の関係として正しいものはどれですか？',
    choices: [
      'A. 1つのリージョンは複数のアベイラビリティーゾーンで構成される',
      'B. 1つのアベイラビリティーゾーンは複数のリージョンで構成される',
      'C. リージョンとアベイラビリティーゾーンは同じ意味である',
      'D. アベイラビリティーゾーンは世界に1つしか存在しない',
    ],
    correctIndex: 0,
    explanation: 'リージョンは地理的に独立した領域で、それぞれが複数の物理的に分離されたアベイラビリティーゾーン(AZ)で構成されます。複数AZに分散することで高可用性を実現できます。',
    questionEn: 'Which statement correctly describes the relationship between an AWS Region and an Availability Zone (AZ)?',
    choicesEn: [
      'A. One Region consists of multiple Availability Zones',
      'B. One Availability Zone consists of multiple Regions',
      'C. Region and Availability Zone mean the same thing',
      'D. There is only one Availability Zone in the world',
    ],
    explanationEn: 'A Region is a separate geographic area, and each Region is made up of multiple physically isolated Availability Zones (AZs). Spreading resources across AZs provides high availability.',
  },
  {
    question: 'AWSの責任共有モデルにおいて、通常「お客様」が責任を負うのはどれですか？',
    choices: [
      'A. 物理的なデータセンターのセキュリティ',
      'B. ハードウェアの保守',
      'C. お客様データやIAMユーザーのアクセス管理',
      'D. ハイパーバイザーのパッチ適用',
    ],
    correctIndex: 2,
    explanation: '責任共有モデルでは、AWSが「クラウドのセキュリティ（物理設備・ハードウェア等）」を、お客様が「クラウド内のセキュリティ（データ、アクセス管理、暗号化設定等）」を担当します。',
    questionEn: 'Under the AWS shared responsibility model, which item is typically the customer\'s responsibility?',
    choicesEn: [
      'A. Physical security of the data centers',
      'B. Maintenance of the hardware',
      'C. Customer data and IAM user access management',
      'D. Patching the hypervisor',
    ],
    explanationEn: 'In the shared responsibility model, AWS is responsible for "security OF the cloud" (physical facilities, hardware, etc.), while the customer is responsible for "security IN the cloud" (data, access management, encryption settings, etc.).',
  },
  {
    question: 'Amazon S3 が提供するのはどのようなストレージですか？',
    choices: [
      'A. ブロックストレージ',
      'B. オブジェクトストレージ',
      'C. ファイルシステム専用ストレージ',
      'D. リレーショナルデータベース',
    ],
    correctIndex: 1,
    explanation: 'Amazon S3 (Simple Storage Service) はオブジェクトストレージサービスで、任意の量のデータをオブジェクトとして保存できます。ブロックストレージは Amazon EBS が提供します。',
    questionEn: 'What kind of storage does Amazon S3 provide?',
    choicesEn: [
      'A. Block storage',
      'B. Object storage',
      'C. Dedicated file system storage',
      'D. Relational database',
    ],
    explanationEn: 'Amazon S3 (Simple Storage Service) is an object storage service that lets you store any amount of data as objects. Block storage is provided by Amazon EBS.',
  },
  {
    question: 'Amazon EC2 とは何のサービスですか？',
    choices: [
      'A. マネージド型のリレーショナルデータベース',
      'B. サーバーレスの関数実行サービス',
      'C. 仮想サーバー（コンピューティング）を提供するサービス',
      'D. コンテンツ配信ネットワーク(CDN)',
    ],
    correctIndex: 2,
    explanation: 'Amazon EC2 (Elastic Compute Cloud) は、再サイズ可能な仮想サーバー（インスタンス）を提供するコンピューティングサービスです。RDS はデータベース、Lambda はサーバーレス関数、CloudFront は CDN です。',
    questionEn: 'What kind of service is Amazon EC2?',
    choicesEn: [
      'A. A managed relational database',
      'B. A serverless function execution service',
      'C. A service that provides virtual servers (compute)',
      'D. A content delivery network (CDN)',
    ],
    explanationEn: 'Amazon EC2 (Elastic Compute Cloud) is a compute service that provides resizable virtual servers (instances). RDS is a database, Lambda is serverless functions, and CloudFront is a CDN.',
  },
  {
    question: 'IAM (Identity and Access Management) の主な目的はどれですか？',
    choices: [
      'A. AWSリソースへのアクセスを認証・認可で制御する',
      'B. 静的Webサイトをホスティングする',
      'C. アプリケーションのログを収集する',
      'D. データを自動でバックアップする',
    ],
    correctIndex: 0,
    explanation: 'IAM は、誰が(認証)どのAWSリソースに対して何を実行できるか(認可)を安全に制御するためのサービスです。ユーザー、グループ、ロール、ポリシーで権限を管理します。',
    questionEn: 'What is the primary purpose of IAM (Identity and Access Management)?',
    choicesEn: [
      'A. To control access to AWS resources through authentication and authorization',
      'B. To host static websites',
      'C. To collect application logs',
      'D. To automatically back up data',
    ],
    explanationEn: 'IAM is a service that securely controls who (authentication) can do what (authorization) on which AWS resources. It manages permissions using users, groups, roles, and policies.',
  },
  {
    question: 'AWSにおける「弾力性(Elasticity)」を最もよく表しているのはどれですか？',
    choices: [
      'A. 需要に応じてリソースを自動的に拡張・縮小できること',
      'B. データを永続的に保存できること',
      'C. すべてのサービスが無料であること',
      'D. 物理サーバーを購入して所有すること',
    ],
    correctIndex: 0,
    explanation: '弾力性とは、負荷や需要の変化に合わせてコンピューティングリソースを自動的にスケールアウト／スケールインできる能力を指します。Auto Scaling などで実現します。',
    questionEn: 'Which best describes "elasticity" in AWS?',
    choicesEn: [
      'A. The ability to automatically scale resources out and in based on demand',
      'B. The ability to store data permanently',
      'C. All services being free of charge',
      'D. Purchasing and owning physical servers',
    ],
    explanationEn: 'Elasticity is the ability to automatically scale computing resources out and in to match changes in load or demand. It is achieved with services such as Auto Scaling.',
  },
  {
    question: 'Amazon VPC (Virtual Private Cloud) の役割として正しいものはどれですか？',
    choices: [
      'A. AWS上に論理的に分離された仮想ネットワークを構築する',
      'B. リレーショナルデータベースを提供する',
      'C. 機械学習モデルを訓練する',
      'D. メールを送信する',
    ],
    correctIndex: 0,
    explanation: 'Amazon VPC を使うと、AWSクラウド内に論理的に分離された自分専用の仮想ネットワークを定義し、サブネット、ルートテーブル、ゲートウェイなどを構成できます。',
    questionEn: 'Which statement correctly describes the role of Amazon VPC (Virtual Private Cloud)?',
    choicesEn: [
      'A. It builds a logically isolated virtual network within AWS',
      'B. It provides a relational database',
      'C. It trains machine learning models',
      'D. It sends email',
    ],
    explanationEn: 'Amazon VPC lets you define your own logically isolated virtual network within the AWS Cloud, where you can configure subnets, route tables, gateways, and more.',
  },
  {
    question: 'クラウドコンピューティングの利点として正しいものはどれですか？',
    choices: [
      'A. 初期の大規模な設備投資(CapEx)を変動費(OpEx)に置き換えられる',
      'B. 使わなくても常に固定料金がかかる',
      'C. リソースの調達に数週間かかる',
      'D. 世界中に展開できない',
    ],
    correctIndex: 0,
    explanation: 'クラウドの主要な利点の1つは、事前の高額な設備投資(CapEx)を、実際に使用した分だけ支払う変動費(OpEx)へ置き換えられることです。従量課金モデルにより無駄を減らせます。',
    questionEn: 'Which is a benefit of cloud computing?',
    choicesEn: [
      'A. You can trade large upfront capital expense (CapEx) for variable expense (OpEx)',
      'B. You always pay a fixed fee even when not using it',
      'C. Provisioning resources takes several weeks',
      'D. You cannot deploy globally',
    ],
    explanationEn: 'One key benefit of the cloud is trading large upfront capital expense (CapEx) for variable expense (OpEx), where you pay only for what you use. The pay-as-you-go model reduces waste.',
  },
  {
    question: 'サーバーの管理をせずにコードを実行できる、AWSのサーバーレスコンピューティングサービスはどれですか？',
    choices: [
      'A. Amazon EC2',
      'B. AWS Lambda',
      'C. Amazon S3',
      'D. Amazon RDS',
    ],
    correctIndex: 1,
    explanation: 'AWS Lambda はサーバーレスのコンピューティングサービスで、サーバーのプロビジョニングや管理をせずにコードを実行できます。実行時間に対してのみ課金されます。',
    questionEn: 'Which AWS serverless compute service lets you run code without managing servers?',
    choicesEn: [
      'A. Amazon EC2',
      'B. AWS Lambda',
      'C. Amazon S3',
      'D. Amazon RDS',
    ],
    explanationEn: 'AWS Lambda is a serverless compute service that runs your code without provisioning or managing servers. You are billed only for the compute time you consume.',
  },
  {
    question: 'Amazon RDS が提供するのはどのようなサービスですか？',
    choices: [
      'A. マネージド型のリレーショナルデータベース',
      'B. オブジェクトストレージ',
      'C. コンテンツ配信',
      'D. 仮想デスクトップ',
    ],
    correctIndex: 0,
    explanation: 'Amazon RDS (Relational Database Service) は、MySQL、PostgreSQL、Amazon Aurora などをマネージドで提供し、パッチ適用・バックアップ・復旧などの運用作業を AWS が代行します。',
    questionEn: 'What kind of service does Amazon RDS provide?',
    choicesEn: [
      'A. A managed relational database',
      'B. Object storage',
      'C. Content delivery',
      'D. Virtual desktops',
    ],
    explanationEn: 'Amazon RDS (Relational Database Service) provides managed relational databases such as MySQL, PostgreSQL, and Amazon Aurora, with AWS handling operational tasks like patching, backups, and recovery.',
  },
  {
    question: 'AWSでコストを見積もる際に役立つ、無料のツールはどれですか？',
    choices: [
      'A. AWS Pricing Calculator',
      'B. Amazon CloudWatch',
      'C. AWS Shield',
      'D. Amazon Route 53',
    ],
    correctIndex: 0,
    explanation: 'AWS Pricing Calculator は、利用予定のサービスに基づいて事前にコストを見積もれる無料ツールです。CloudWatch は監視、Shield は DDoS 保護、Route 53 は DNS サービスです。',
    questionEn: 'Which free tool helps you estimate costs on AWS?',
    choicesEn: [
      'A. AWS Pricing Calculator',
      'B. Amazon CloudWatch',
      'C. AWS Shield',
      'D. Amazon Route 53',
    ],
    explanationEn: 'AWS Pricing Calculator is a free tool that lets you estimate costs in advance based on the services you plan to use. CloudWatch is for monitoring, Shield is for DDoS protection, and Route 53 is a DNS service.',
  },
  {
    question: 'AWSのグローバルサービス（特定のリージョンに属さない）はどれですか？',
    choices: [
      'A. Amazon EC2',
      'B. Amazon IAM',
      'C. Amazon RDS',
      'D. Amazon VPC',
    ],
    correctIndex: 1,
    explanation: 'IAM はグローバルサービスで、特定のリージョンに紐づきません。EC2、RDS、VPC はいずれもリージョン単位のサービスです。',
    questionEn: 'Which AWS service is a global service (not tied to a specific Region)?',
    choicesEn: [
      'A. Amazon EC2',
      'B. Amazon IAM',
      'C. Amazon RDS',
      'D. Amazon VPC',
    ],
    explanationEn: 'IAM is a global service and is not tied to a specific Region. EC2, RDS, and VPC are all Region-scoped services.',
  },
  {
    question: 'Amazon CloudFront の主な用途はどれですか？',
    choices: [
      'A. コンテンツを世界中のエッジロケーションから低遅延で配信する',
      'B. 仮想サーバーを起動する',
      'C. リレーショナルデータを保存する',
      'D. IAMポリシーを作成する',
    ],
    correctIndex: 0,
    explanation: 'Amazon CloudFront は CDN (コンテンツ配信ネットワーク) で、世界中のエッジロケーションにコンテンツをキャッシュして、ユーザーに低遅延で配信します。',
    questionEn: 'What is the primary use of Amazon CloudFront?',
    choicesEn: [
      'A. To deliver content from edge locations worldwide with low latency',
      'B. To launch virtual servers',
      'C. To store relational data',
      'D. To create IAM policies',
    ],
    explanationEn: 'Amazon CloudFront is a CDN (content delivery network) that caches content at edge locations around the world to deliver it to users with low latency.',
  },
  {
    question: 'AWSのサポートプランのうち、追加費用なしですべてのお客様が利用できるのはどれですか？',
    choices: [
      'A. ベーシックサポート',
      'B. ビジネスサポート',
      'C. エンタープライズサポート',
      'D. デベロッパーサポート',
    ],
    correctIndex: 0,
    explanation: 'ベーシックサポートは、追加費用なしですべてのAWSアカウントに提供されます。ドキュメント、ホワイトペーパー、AWS Trusted Advisor のコアチェックなどが含まれます。',
    questionEn: 'Which AWS Support plan is available to all customers at no additional cost?',
    choicesEn: [
      'A. Basic Support',
      'B. Business Support',
      'C. Enterprise Support',
      'D. Developer Support',
    ],
    explanationEn: 'Basic Support is provided to all AWS accounts at no additional cost. It includes documentation, whitepapers, and the core checks of AWS Trusted Advisor.',
  },
  {
    question: 'アプリケーションへのトラフィックを複数のターゲットに自動的に分散させるAWSサービスはどれですか？',
    choices: [
      'A. Elastic Load Balancing (ELB)',
      'B. Amazon S3',
      'C. AWS IAM',
      'D. Amazon SNS',
    ],
    correctIndex: 0,
    explanation: 'Elastic Load Balancing (ELB) は、受信トラフィックを複数のEC2インスタンスなどのターゲットに自動的に分散し、可用性と耐障害性を高めます。',
    questionEn: 'Which AWS service automatically distributes incoming application traffic across multiple targets?',
    choicesEn: [
      'A. Elastic Load Balancing (ELB)',
      'B. Amazon S3',
      'C. AWS IAM',
      'D. Amazon SNS',
    ],
    explanationEn: 'Elastic Load Balancing (ELB) automatically distributes incoming traffic across multiple targets such as EC2 instances, improving availability and fault tolerance.',
  },
  {
    question: 'AWSアカウントのルートユーザーについての推奨事項として正しいものはどれですか？',
    choices: [
      'A. 日常的な作業はルートユーザーで行うべきである',
      'B. 多要素認証(MFA)を有効にし、日常作業にはIAMユーザーを使うべきである',
      'C. ルートユーザーのアクセスキーを広く共有すべきである',
      'D. パスワードは設定しない方がよい',
    ],
    correctIndex: 1,
    explanation: 'ルートユーザーは強力な権限を持つため、MFAを有効化し、日常的な操作には権限を絞ったIAMユーザーやロールを使うのがベストプラクティスです。',
    questionEn: 'Which is a recommended best practice for the AWS account root user?',
    choicesEn: [
      'A. You should perform daily tasks as the root user',
      'B. Enable multi-factor authentication (MFA) and use IAM users for daily tasks',
      'C. Share the root user access keys widely',
      'D. It is better not to set a password',
    ],
    explanationEn: 'Because the root user has powerful permissions, the best practice is to enable MFA and use least-privilege IAM users or roles for everyday operations.',
  },
  {
    question: 'Amazon DynamoDB はどのようなデータベースですか？',
    choices: [
      'A. マネージド型のNoSQLデータベース',
      'B. リレーショナルデータベース',
      'C. データウェアハウス',
      'D. インメモリキャッシュ専用',
    ],
    correctIndex: 0,
    explanation: 'Amazon DynamoDB は、フルマネージドのキーバリュー／ドキュメント型NoSQLデータベースで、任意規模でも一貫した高速性能を提供します。',
    questionEn: 'What kind of database is Amazon DynamoDB?',
    choicesEn: [
      'A. A managed NoSQL database',
      'B. A relational database',
      'C. A data warehouse',
      'D. An in-memory cache only',
    ],
    explanationEn: 'Amazon DynamoDB is a fully managed key-value and document NoSQL database that delivers consistent, fast performance at any scale.',
  },
  {
    question: 'AWS Well-Architected Framework の柱に含まれないものはどれですか？',
    choices: [
      'A. 運用上の優秀性',
      'B. セキュリティ',
      'C. マーケティング効果',
      'D. コスト最適化',
    ],
    correctIndex: 2,
    explanation: 'AWS Well-Architected Framework の柱は、運用上の優秀性、セキュリティ、信頼性、パフォーマンス効率、コスト最適化、持続可能性です。「マーケティング効果」は含まれません。',
    questionEn: 'Which of the following is NOT a pillar of the AWS Well-Architected Framework?',
    choicesEn: [
      'A. Operational Excellence',
      'B. Security',
      'C. Marketing effectiveness',
      'D. Cost Optimization',
    ],
    explanationEn: 'The pillars of the AWS Well-Architected Framework are Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability. "Marketing effectiveness" is not one of them.',
  },
  {
    question: 'Amazon EC2 の料金モデルのうち、長期間の利用を前提に大幅な割引を受けられるのはどれですか？',
    choices: [
      'A. オンデマンドインスタンス',
      'B. リザーブドインスタンス / Savings Plans',
      'C. スポットインスタンスのみ',
      'D. 無料利用枠のみ',
    ],
    correctIndex: 1,
    explanation: 'リザーブドインスタンスや Savings Plans は、1年または3年の利用をコミットすることで、オンデマンド料金に比べ大幅な割引を受けられます。',
    questionEn: 'Which Amazon EC2 pricing model offers significant discounts in exchange for a long-term usage commitment?',
    choicesEn: [
      'A. On-Demand Instances',
      'B. Reserved Instances / Savings Plans',
      'C. Spot Instances only',
      'D. Free Tier only',
    ],
    explanationEn: 'Reserved Instances and Savings Plans offer significant discounts compared to On-Demand pricing in exchange for a 1-year or 3-year usage commitment.',
  },
  {
    question: 'リソースやコストの状況を監視し、メトリクスやアラームを提供するAWSサービスはどれですか？',
    choices: [
      'A. Amazon CloudWatch',
      'B. AWS Lambda',
      'C. Amazon S3',
      'D. AWS IAM',
    ],
    correctIndex: 0,
    explanation: 'Amazon CloudWatch は、AWSリソースやアプリケーションのメトリクス、ログ、アラームを収集・監視するモニタリングサービスです。',
    questionEn: 'Which AWS service monitors resources and costs, providing metrics and alarms?',
    choicesEn: [
      'A. Amazon CloudWatch',
      'B. AWS Lambda',
      'C. Amazon S3',
      'D. AWS IAM',
    ],
    explanationEn: 'Amazon CloudWatch is a monitoring service that collects and tracks metrics, logs, and alarms for AWS resources and applications.',
  },
  {
    question: 'AWSの「高可用性」を高めるための一般的な方法はどれですか？',
    choices: [
      'A. 単一のアベイラビリティーゾーンにすべてを集約する',
      'B. 複数のアベイラビリティーゾーンにリソースを分散する',
      'C. バックアップを取らない',
      'D. すべてを1台のサーバーで動かす',
    ],
    correctIndex: 1,
    explanation: '複数のアベイラビリティーゾーンにリソースを分散配置することで、1つのAZに障害が発生してもシステム全体を稼働させ続けられ、高可用性を実現できます。',
    questionEn: 'Which is a common way to increase "high availability" in AWS?',
    choicesEn: [
      'A. Consolidate everything into a single Availability Zone',
      'B. Distribute resources across multiple Availability Zones',
      'C. Do not take backups',
      'D. Run everything on a single server',
    ],
    explanationEn: 'Distributing resources across multiple Availability Zones lets the overall system keep running even if one AZ fails, achieving high availability.',
  },
  {
    question: 'Amazon S3 に保存したオブジェクトへのアクセス頻度が低い場合に、コストを抑えられるストレージクラスはどれですか？',
    choices: [
      'A. S3 Standard',
      'B. S3 Standard-IA (低頻度アクセス)',
      'C. S3 だけでは選べない',
      'D. Amazon EBS',
    ],
    correctIndex: 1,
    explanation: 'S3 Standard-IA (Infrequent Access) は、アクセス頻度は低いが必要なときに素早く取り出したいデータ向けの低コストなストレージクラスです。',
    questionEn: 'For objects in Amazon S3 that are accessed infrequently, which storage class can reduce cost?',
    choicesEn: [
      'A. S3 Standard',
      'B. S3 Standard-IA (Infrequent Access)',
      'C. You cannot choose within S3',
      'D. Amazon EBS',
    ],
    explanationEn: 'S3 Standard-IA (Infrequent Access) is a lower-cost storage class for data that is accessed infrequently but must be retrieved quickly when needed.',
  },
  {
    question: 'AWS のマネージドサービスを使う主なメリットはどれですか？',
    choices: [
      'A. お客様がすべてのインフラを手動で管理する必要がある',
      'B. パッチ適用やバックアップなどの運用負荷を AWS が肩代わりしてくれる',
      'C. 常にオンプレミスより高価になる',
      'D. インターネット接続が不要になる',
    ],
    correctIndex: 1,
    explanation: 'マネージドサービス(例: RDS, DynamoDB, Lambda)は、パッチ適用・バックアップ・スケーリングなどの運用作業を AWS が代行するため、お客様はアプリケーションに集中できます。',
    questionEn: 'What is a key benefit of using AWS managed services?',
    choicesEn: [
      'A. The customer must manually manage all infrastructure',
      'B. AWS handles operational tasks such as patching and backups',
      'C. They are always more expensive than on-premises',
      'D. They remove the need for an internet connection',
    ],
    explanationEn: 'Managed services (e.g., RDS, DynamoDB, Lambda) let AWS take on operational tasks such as patching, backups, and scaling, so customers can focus on their applications.',
  },
  {
    question: '複数のAWSアカウントをまとめて管理し、一括請求(Consolidated Billing)を行えるサービスはどれですか？',
    choices: [
      'A. AWS Organizations',
      'B. Amazon EC2',
      'C. AWS Lambda',
      'D. Amazon S3',
    ],
    correctIndex: 0,
    explanation: 'AWS Organizations を使うと、複数のAWSアカウントを一元的に管理し、一括請求(Consolidated Billing)やポリシーによるガバナンスを適用できます。',
    questionEn: 'Which service lets you centrally manage multiple AWS accounts and use consolidated billing?',
    choicesEn: [
      'A. AWS Organizations',
      'B. Amazon EC2',
      'C. AWS Lambda',
      'D. Amazon S3',
    ],
    explanationEn: 'AWS Organizations lets you centrally manage multiple AWS accounts, apply consolidated billing, and enforce governance through policies.',
  },
];

/**
 * ローカル日付ベースの日付キー "YYYY-MM-DD" を返す。
 * storage.js の getLocalDayString と同じくローカルタイムの
 * getFullYear/getMonth/getDate を用いてタイムゾーン一貫かつ日内で安定させる。
 * @param {Date} d
 * @returns {string}
 */
function getLocalDayString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日付キー "YYYY-MM-DD" を決定的な整数シードへ変換する。
 * @param {string} dayString
 * @returns {number} 32bit 符号なし整数
 */
function dayStringToSeed(dayString) {
  let h = 2166136261 >>> 0; // FNV-1a offset basis
  for (let i = 0; i < dayString.length; i++) {
    h ^= dayString.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * mulberry32: 小さく決定的な擬似乱数生成器。
 * @param {number} seed
 * @returns {() => number} 0以上1未満の擬似乱数を返す関数
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * プールの問題を指定 locale のレンダラー形状へ正規化する。
 * en フィールドが欠落している場合は ja フィールドにフォールバックする。
 * @param {object} q
 * @param {'ja'|'en'} locale
 * @returns {{ question: string, choices: string[], correctIndex: number, explanation: string }}
 */
function localizeQuestion(q, locale) {
  const useEn = locale === 'en';
  return {
    question: (useEn && q.questionEn) ? q.questionEn : q.question,
    choices: (useEn && Array.isArray(q.choicesEn)) ? q.choicesEn.slice() : q.choices.slice(),
    correctIndex: q.correctIndex,
    explanation: (useEn && q.explanationEn) ? q.explanationEn : q.explanation,
  };
}

/**
 * その日のデイリーチャレンジ問題を決定的に返す。
 *
 * 同一ローカル日付内では常に同じ問題・同じ順序を返し（日内で安定）、
 * 日付が変わるとローテーションする（日をまたぐと変化）。
 * AI プロバイダーや API キーは一切不要な、純粋・同期・副作用なしの関数。
 *
 * @param {number} [count=5] 返す問題数（プールサイズ上限でクランプ）
 * @param {Date} [date=new Date()] 基準となる日付
 * @param {'ja'|'en'} [locale='ja'] 出力ロケール
 * @returns {Array<{ question: string, choices: string[], correctIndex: number, explanation: string }>}
 */
export function getDailyChallengeQuestions(count = 5, date = new Date(), locale = 'ja') {
  const pool = DAILY_CHALLENGE_QUESTIONS;
  const total = pool.length;
  const n = Math.max(0, Math.min(Number(count) || 0, total));
  if (n === 0) return [];

  const dayString = getLocalDayString(date instanceof Date ? date : new Date(date));
  const rand = mulberry32(dayStringToSeed(dayString));

  // インデックス配列を決定的にシャッフル(Fisher-Yates)し、先頭 n 件を選ぶ。
  const indices = pool.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }

  return indices.slice(0, n).map((idx) => localizeQuestion(pool[idx], locale));
}
