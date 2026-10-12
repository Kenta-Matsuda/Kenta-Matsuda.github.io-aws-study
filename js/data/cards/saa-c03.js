/**
 * SAA-C03 case cards (issue #225, design §4.1).
 *
 * Each card is a build case mined from an AWS blog post that the exam's
 * resources already recommend: the situation and constraints, the decision
 * points the architect faced, what was chosen and why, and the alternatives
 * that were rejected (those become realistic distractors). Facts come from the
 * post; where the post is silent the field says so rather than guessing.
 *
 * First inventory (4 posts, 2026-10-12). Coverage is far below the requirement
 * (65 questions × 1.5); the pipeline uses these units for the tasks they map to
 * and falls back to task-statement items elsewhere. Human review required.
 */

export const CARDS_SAA_C03 = {
  examId: 'saa-c03',
  cards: [
    {
      id: 'saa-case-scp-multi-account',
      kind: 'case',
      source: {
        title: 'Get more out of service control policies in a multi-account environment',
        url: 'https://aws.amazon.com/blogs/security/get-more-out-of-service-control-policies-in-a-multi-account-environment/',
        kind: 'blog',
        verifiedAt: '2026-10-12',
        note: '記事本文は 2020 年代前半の内容。ページには SCP クォータが 2026-05-20 に更新された旨と、2025-09-19 以降 SCP が IAM ポリシー言語を完全サポートする旨の注記がある。数値はクォータドキュメントを優先する。',
      },
      context: 'AWS Organizations で開発・テスト・本番などを別アカウントに分けて多数のアカウントを運用しており、中央チームはアカウントが増えても拡張できる組織全体のガードレールを必要としている。',
      constraints: ['ルート・OU・アカウントそれぞれに添付できる SCP は最大 10', 'OU のネストは最大 5 階層', 'SCP のサイズ制限（空白も文字数に含まれる）', '組織あたりの SCP 数に上限がある'],
      tasks: ['1.1'],
      pitfalls: [
        'ルートの FullAWSAccess がプリンシパルに権限を付与すると誤解しやすい。SCP は権限をフィルタするだけで、プリンシパルには別途 ID ベースのポリシーが必要',
        'Allow はルートから自動で下へ流れない。Deny は継承されるが、Allow はパス上の全階層に存在する必要がある',
        '`securityhub:Disable*` のようなワイルドカードは将来追加されるアクションにも及び、予期せず拒否されることがある',
        'Sid を削除するとサイズは節約できるが、各ステートメントの意図を別途索引しておきたい',
      ],
      decisions: [
        {
          id: 'd1',
          question: '添付数の上限（1 エンティティに 10）の中で多数の統制をどう収めるか',
          chosen: '複数のステートメントを少数のポリシーにまとめる。既定の FullAWSAccess の Allow を残し、同じ文書に Deny ステートメントを追加する。Effect / Resource / Condition が一致する Action 要素は統合する',
          why: '統制ごとに 1 ポリシーにすると添付クォータ（10）にすぐ達するため',
          rejected: [
            { option: '統制ごとに個別の SCP を作って添付する', why: '添付数の上限 10 にすぐ到達する' },
          ],
          services: ['AWS Organizations', 'SCP'],
          tasks: ['1.1'],
          level: 'associate',
        },
        {
          id: 'd2',
          question: '各統制をルート・OU・アカウントのどこに置くか',
          chosen: '組織全体の統制（アカウントの組織離脱の禁止、CloudTrail の改変禁止、AWS Config の無効化禁止など）はルートに置き、下層ほど粒度を細かくする',
          why: 'Deny は継承されて下の全階層に適用されるが、Allow は継承されず各階層に必要なため、全体統制は Deny としてルートに置くのが確実',
          rejected: [
            { option: 'すべての統制をルートに置く', why: 'ワークロード種別の差を無視し、ルートのポリシーを調整しづらくなる' },
            { option: 'ルートに Allow を置けば下層に自動で許可が伝わると期待する', why: 'Allow は継承されない' },
          ],
          services: ['AWS Organizations', 'AWS CloudTrail', 'AWS Config'],
          tasks: ['1.1'],
          level: 'associate',
        },
        {
          id: 'd3',
          question: 'ワークロード種別ごとに異なるガードレールをどう適用するか',
          chosen: 'Infrastructure / Sandbox / Workload のようにワークロード種別ごとの OU を作り、OU 単位で SCP を調整する（Sandbox は制限を緩く、プライベートなワークロードはインターネット到達性を遮断、など）',
          why: 'OU 単位なら種別ごとの要件に合わせた統制を継承で一括適用できる',
          rejected: [
            { option: 'アカウントごとに個別の SCP を手で添付する', why: 'アカウントが増えるほど保守できず、添付上限にも当たる' },
          ],
          services: ['AWS Organizations（OU）'],
          tasks: ['1.1'],
          level: 'associate',
        },
        {
          id: 'd4',
          question: 'SCP は許可リスト型と拒否リスト型のどちらで書くか',
          chosen: '明示的な Deny を優先する。承認リージョン以外をすべて拒否する場合は NotAction を使った Deny と `aws:RequestedRegion` 条件を使い、グローバルサービスを例外として列挙する',
          why: '広い／重なり合う Allow は、より厳しい Allow を上書きして意図しないアクセスを生むリスクがある',
          rejected: [
            { option: '許可リスト型（Allow のみ）の SCP で統制する', why: '広い Allow が厳しい Allow を上書きし得る' },
          ],
          services: ['SCP', 'IAM ポリシー評価ロジック', 'aws:RequestedRegion'],
          tasks: ['1.1', '1.2'],
          level: 'associate',
        },
        {
          id: 'd5',
          question: 'ポリシーのサイズ制限内に収めるにはどうするか',
          chosen: '空白を削除し、ワイルドカードやプレフィックスを使い、任意の Sid を省き、JSON を最小化するスクリプトを使う',
          why: '空白もサイズクォータに数えられ、コンソールの整形は手作業やスクリプトのワークフローには効かない',
          rejected: [
            { option: 'コンソールの自動整形に任せる', why: '手編集やスクリプト経由の更新では空白が残る' },
          ],
          services: ['SCP'],
          tasks: ['1.1'],
          level: 'associate',
        },
      ],
    },
    {
      id: 'saa-case-eda-ownership',
      kind: 'case',
      source: {
        title: 'Best practices for implementing event-driven architectures in your organization',
        url: 'https://aws.amazon.com/blogs/architecture/best-practices-for-implementing-event-driven-architectures-in-your-organization/',
        kind: 'blog',
        publishedAt: '2023-07',
        verifiedAt: '2026-10-12',
      },
      context: 'サーバーレス関数の呼び出し、非同期メッセージングとイベント永続化によるマイクロサービスの分離、サードパーティやオンプレミスを含む業務ドメイン横断の疎結合のためにイベント駆動アーキテクチャ（EDA）を広げたい組織。チームの独立性と機能提供の速さを重視する。',
      constraints: ['メッセージブローカーの所有者を誰にするかは組織構造に依存する', 'チームの独立性を損なわない', 'エンドツーエンドの追跡可能性が必要'],
      tasks: ['2.1'],
      pitfalls: [
        'CCoE を外部の独立チームにしてはいけない。エンジニアリングチームのメンバーで構成して DevOps 文化を保つ',
        '中央のプラットフォームチームは開発と展開の両方で単一障害点になりうる',
        'ブローカーは基本的にイベントの内容に無関心だが、ペイロードやメタデータでルーティングするものもある',
        '同じイベントでも消費者ごとにビジネス上の意味が異なりうるため、共通の解釈を前提にしない',
      ],
      decisions: [
        {
          id: 'd1',
          question: 'プロデューサー・ブローカー・コンシューマーの責任分担をどう決めるか',
          chosen: 'プロデューサーはイベントのスキーマと意味を所有し変更を管理する。コンシューマーはイベントのビジネス上の効果を所有し、失敗と重複配信を処理する。ブローカーは耐久性とアクセス制御を提供する',
          why: '境界を分けておけば、新しいコンシューマーがプロデューサーの契約を変えずに参加できる',
          rejected: [
            { option: 'プロデューサーがコンシューマー側の失敗・重複処理まで面倒を見る', why: 'コンシューマー追加のたびにプロデューサーの変更が必要になり結合が強まる' },
          ],
          services: ['Amazon EventBridge', 'Amazon SNS', 'Amazon SQS'],
          tasks: ['2.1'],
          level: 'associate',
        },
        {
          id: 'd2',
          question: 'メッセージブローカーの所有を中央集権にするか分散にするか',
          chosen: 'ハイブリッド: クラウド CoE（CCoE）が非機能要件を標準化し、ブローカーの所有はプロデューサーチームに分散して CCoE のガイドライン内で適切なツールを選べるようにし、ログ標準と観測性は中央化してエンドツーエンドの追跡を可能にする',
          why: '完全中央化は単一障害点とボトルネックになり、完全分散は成熟した DevOps 文化がないと機能しない',
          rejected: [
            { option: '専任プラットフォームチームによる完全中央化', why: '信頼性・可用性・セキュリティは標準化できるが、単一障害点かつボトルネックになりチームの独立性と運用効率を損なう' },
            { option: '完全分散（各チームが自由に）', why: 'チームの独立性は最大だが、成熟した DevOps 文化が前提で、どの組織にも合うわけではない' },
          ],
          services: ['Amazon EventBridge', 'Amazon SNS', 'Amazon SQS', 'Amazon MSK', 'Amazon Kinesis Data Streams'],
          tasks: ['2.1'],
          level: 'associate',
        },
        {
          id: 'd3',
          question: '分散所有の実装としてトピックのファンアウトとイベントバスのどちらを選ぶか',
          chosen: '用途に応じて選ぶ: トピックのファンアウトは SNS + SQS、バス型のパターンは EventBridge',
          why: 'ファンアウトは単純な一対多の配信、バスはルーティングルールを持つ疎結合な統合に向く',
          rejected: [
            { option: 'すべてをストリーミング（MSK / Kinesis Data Streams）で統一する', why: '専任チームの下では運用しやすいが、データのパーティショニングとスケーリングの深い理解が必要' },
          ],
          services: ['Amazon SNS', 'Amazon SQS', 'Amazon EventBridge'],
          tasks: ['2.1'],
          level: 'associate',
        },
        {
          id: 'd4',
          question: 'スキーマ変更をどう扱うか',
          chosen: '非破壊的変更はプロデューサーが管理し、破壊的変更はプロデューサーとコンシューマーが移行を交渉する',
          why: 'プロデューサーがスキーマと意味の所有者であり、破壊的変更は消費側の互換性を壊すため',
          rejected: [
            { option: '破壊的変更も通知なしにプロデューサーが一方的に適用する', why: 'コンシューマーが壊れ、EDA の疎結合の利点が失われる' },
          ],
          services: ['Amazon EventBridge（スキーマレジストリ）'],
          tasks: ['2.1'],
          level: 'associate',
        },
      ],
    },
    {
      id: 'saa-case-dr-pilot-light-warm-standby',
      kind: 'case',
      source: {
        title: 'Disaster Recovery (DR) Architecture on AWS, Part III: Pilot Light and Warm Standby',
        url: 'https://aws.amazon.com/blogs/architecture/disaster-recovery-dr-architecture-on-aws-part-iii-pilot-light-and-warm-standby/',
        urlJa: 'https://aws.amazon.com/jp/blogs/news/disaster-recovery-dr-architecture-on-aws-part-iii-pilot-light-and-warm-standby/',
        kind: 'blog',
        verifiedAt: '2026-10-12',
      },
      context: '自然災害・技術的障害・人的操作（データの削除や破損を含む）からワークロードを回復させたい。プライマリリージョンがトラフィックを処理し、復旧リージョンはフェイルオーバーまで待機するアクティブ／パッシブ構成を前提に、RTO / RPO とコストのバランスを取る。',
      constraints: ['RTO と RPO の目標（記事は具体値を示していない）', 'DR 環境の構築・維持コスト', 'アクティブ／パッシブ構成'],
      tasks: ['2.2'],
      pitfalls: [
        'パイロットライトはそれ自体ではリクエストを処理できない（炉の点火用の小さな炎になぞらえた名前）',
        'レプリケーションはバックアップではない。破損・削除されたデータもレプリケートされる',
        'サーバーの生存確認だけでは DR 判断の根拠にならない',
        '完全自動フェイルオーバーは誤検知のリスクがあり、不要なフェイルオーバーとフェイルバックのたびに損失が出る',
        'テンプレートで展開したパッシブスタックは自動的に本番準備済みにはならない',
        'RTO / RPO はベストプラクティスでもゼロにはならない',
      ],
      decisions: [
        {
          id: 'd1',
          question: '復旧リージョンに縮小構成の稼働スタックを置くか、コアだけ置いて処理用コンピュートは持たないか',
          chosen: 'RTO を優先するならウォームスタンバイ（各層 1 インスタンスなど縮小容量で稼働し、即時に一部トラフィックを受けつつスケールアウト）。コストを優先するならパイロットライト（コアデータは保持し、コンピュート層は定義のみ、例: 希望容量 0 の Auto Scaling グループ）',
          why: 'ウォームスタンバイは RTO が短く合成トランザクションで準備状態を試験しやすい。パイロットライトは安いがインフラの展開とスケールまでリクエストを処理できない',
          rejected: [
            { option: 'フル容量のパッシブスタック（ホットスタンバイ）', why: 'ウォームスタンバイの変種として言及されるのみで、コストが最も高い' },
            { option: 'パイロットライトで RTO が短いと期待する', why: 'インフラの展開とスケールが完了するまで処理できない' },
          ],
          services: ['Amazon EC2', 'EC2 Auto Scaling', 'Elastic Load Balancing'],
          tasks: ['2.2'],
          level: 'associate',
        },
        {
          id: 'd2',
          question: '復旧リージョンへのデータの扱いはレプリケーションだけでよいか',
          chosen: 'データ（RDS、DynamoDB など）を復旧リージョンへレプリケートし、さらに継続的なバックアップも保持する',
          why: 'レプリケーションだけでは破損・削除も複製されるため、既知の正常状態へ戻すにはバックアップが必要',
          rejected: [
            { option: 'クロスリージョンレプリケーションのみ', why: '人的操作による削除・破損がそのまま複製される' },
          ],
          services: ['Amazon RDS', 'Amazon DynamoDB', 'AWS Backup'],
          tasks: ['2.2', '1.3'],
          level: 'associate',
        },
        {
          id: 'd3',
          question: '災害発生をどの信号で判断するか',
          chosen: 'エラー率、レイテンシ、合成カナリアの結果、ビジネス KPI（異常検知を含む）に基づく CloudWatch アラームを使う',
          why: '単純な生存確認では DR を判断するには不十分',
          rejected: [
            { option: 'サーバーの ping / 生存確認だけで判断する', why: '性能劣化やビジネス影響を捉えられない' },
          ],
          services: ['Amazon CloudWatch（アラーム・Synthetics・異常検知）'],
          tasks: ['2.2'],
          level: 'associate',
        },
        {
          id: 'd4',
          question: '復旧スタックのスケールアップをどう実行するか',
          chosen: 'CLI / SDK でスケーリングをスクリプト化するか、1 つの CloudFormation テンプレートにパラメータと条件（!If / !Equals）を持たせてアクティブ／パッシブの容量を切り替える',
          why: '手順を自動化しておかないと復旧時間が伸び、人的ミスも増える',
          rejected: [
            { option: '復旧時にコンソールで手作業でスケールする', why: 'RTO が伸び、手順の再現性がない' },
          ],
          services: ['AWS CloudFormation', 'AWS CLI', 'AWS SDK'],
          tasks: ['2.2'],
          level: 'associate',
        },
        {
          id: 'd5',
          question: 'フェイルオーバーを自動にするか手動にするか、何で切り替えるか',
          chosen: '自動なら Route 53 のフェイルオーバールーティングとヘルスチェック。手動なら Route 53 Application Recovery Controller のヘルスチェックをオン／オフのスイッチとして使う（データプレーン操作）。Global Accelerator も代替',
          why: '完全自動は誤検知で不要なフェイルオーバーを招くリスクがあり、重み付けルーティングや Global Accelerator のトラフィックダイヤルはコントロールプレーン操作で障害時の信頼性が低い',
          rejected: [
            { option: 'Route 53 の重み付けルーティングの変更で切り替える', why: 'コントロールプレーン操作で、障害時にはデータプレーンのスイッチより回復力が低い' },
            { option: 'Global Accelerator のトラフィックダイヤルで切り替える', why: '同じくコントロールプレーン操作' },
          ],
          services: ['Amazon Route 53', 'Route 53 Application Recovery Controller', 'AWS Global Accelerator'],
          tasks: ['2.2', '3.4'],
          level: 'associate',
        },
      ],
    },
    {
      id: 'saa-case-s3-noncurrent-versions',
      kind: 'case',
      source: {
        title: 'Reduce storage costs with fewer noncurrent versions using Amazon S3 Lifecycle',
        url: 'https://aws.amazon.com/blogs/storage/reduce-storage-costs-with-fewer-noncurrent-versions-using-amazon-s3-lifecycle/',
        kind: 'blog',
        publishedAt: '2022-04-22',
        verifiedAt: '2026-10-12',
      },
      context: 'S3 バージョニングで誤上書き・誤削除からデータを守りたいが、冗長なバージョンの保存コストが気になる。S3 File Gateway のようにファイル変更ごとに新バージョンができるワークロードでは非カレントバージョンが大量に溜まる。最新版が破損した場合に備えて直近の数バージョンは残したい。',
      constraints: ['データ保護（バージョニング）を維持する', '非カレントバージョンの保存コストを抑える', '直近数バージョンは保持する', '影響範囲を限定する'],
      tasks: ['4.1'],
      pitfalls: [
        'ルール条件を満たしてからアクションが完了するまでに遅延があるが、課金はルールを満たした時点で変わる',
        'バージョニングを無効化してコストを抑えるのは、誤上書きからの回復手段を捨てることになる',
        'バケット全体へのルールは意図より広いデータに影響する',
        'ライフサイクルルールが無ければ保持した全非カレントバージョンに課金が続く',
      ],
      decisions: [
        {
          id: 'd1',
          question: 'コスト削減のためにバージョニングを無効化すべきか',
          chosen: 'バージョニングは有効のままにし、コストはライフサイクルで管理する',
          why: 'バージョニングは誤上書き・誤削除からの保護であり、無効化すると上書きで永久に失われる（S3 セキュリティのベストプラクティスにも反する）',
          rejected: [
            { option: 'バージョニングを無効化する', why: '上書き・削除したデータを回復できなくなる' },
            { option: '全非カレントバージョンを無期限に保持する', why: '不要なことが多く、保持した全バージョンに課金される' },
          ],
          services: ['Amazon S3 バージョニング'],
          tasks: ['4.1', '1.3'],
          level: 'associate',
        },
        {
          id: 'd2',
          question: '非カレントバージョンのコストがどこで発生しているかをどう特定するか',
          chosen: 'S3 Storage Lens でバケットごとの非カレントバージョンのバイト数を確認し、コンソールの「バージョンを表示」で個々のキーのバージョンを確認する',
          why: '削減対象のプレフィックスやキーを事実に基づいて絞り込める',
          rejected: [
            { option: '推測でバケット全体にルールを適用する', why: '影響範囲が広がり、必要なデータも消す可能性がある' },
          ],
          services: ['Amazon S3 Storage Lens', 'S3 コンソール'],
          tasks: ['4.1'],
          level: 'associate',
        },
        {
          id: 'd3',
          question: 'ライフサイクルルールの適用範囲とアクション、保持条件をどう設定するか',
          chosen: 'プレフィックス（例: images/）でルールを限定し、アクションは「オブジェクトの非カレントバージョンを完全に削除」。「非カレントになってからの日数」を 1 にし、「保持する新しいバージョンの数」を 2 にして、経過日数に関係なく直近 2 つの非カレントバージョンを残す',
          why: '範囲を絞って影響を限定しつつ、最新版の破損に備える直近バージョンは件数指定で確実に残せる',
          rejected: [
            { option: 'バケット全体に日数指定だけのルールを適用する', why: '直近バージョンも日数経過で消え、意図しないデータにも影響する' },
          ],
          services: ['S3 ライフサイクル設定'],
          tasks: ['4.1'],
          level: 'associate',
        },
      ],
    },
  ],
};

export default CARDS_SAA_C03;
