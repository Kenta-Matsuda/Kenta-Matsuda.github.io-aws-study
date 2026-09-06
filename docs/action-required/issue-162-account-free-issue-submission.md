# GitHub アカウント無しで issue を登録できるようにする（Lambda 経由の投稿プロキシ）

🔴 未対応（要対応）

- 種別: 要人間対応（バックエンド / AWS インフラ / GitHub App の資格情報管理）
- 関連: #162（本件） / #101 #100（クライアント側で下げられる摩擦は対応済み: [フィードバックのハードルを下げる](../issues/feedback-nudge-and-account-free.md)） / #166（画像添付の自動化も同じ経路に載る） / [バックエンド実装計画（アンブレラ）](issue-117-backend-implementation-plan.md)
- 位置づけ: 本ファイルは**設計と人間側の作業の引き継ぎ**です。エージェントは `aws` / `sam` / `cdk` などの操作を**一切実行していません**。記載するコマンドは AWS 権限を持つ人間が精査・調整して実行するための提案（テキスト）です。

## 症状

issue #162:

> Github issues はアカウントなしでも見れるけど、書き込むことはできなかった。aws Lambda を使ってユーザーが
> Github アカウントなしでも issue 登録できるようにしてほしい

現状のフィードバック導線は次の 2 つで、いずれも「アカウント無しで投稿完了」にはなりません。

1. **GitHub の issue 作成画面を開く**（`https://github.com/.../issues/new?...` へ遷移）。閲覧はできるが、投稿には GitHub アカウントとサインインが必要。
2. **テキストをコピー**（#101 で追加）。アカウントは不要だが、送信先を利用者自身が用意する必要があり「投稿完了」までは到達しない。

## 推定原因

不具合ではなく**アーキテクチャ上の制約**です。GitHub の issue 作成 API（`POST /repos/{owner}/{repo}/issues`）は**認証必須**で、トークンをブラウザに置くことはできません（静的サイトに埋め込めば公開され、リポジトリへの書き込み権限が誰にでも渡ります）。したがって「アカウント無しで投稿」を実現するには、**トークンを秘匿して代理投稿するサーバ側の仲介（プロキシ）**が必要です。ご提案どおり Lambda がその役割に適しています。

## 切り分け手順（確認済み）

1. 現行のフィードバック送信経路を確認した。`js/ui.js` の `composeFeedbackIssue` で本文を組み立て、(a) GitHub の issue 新規作成 URL へ遷移、(b) クリップボードへコピー、の 2 経路のみで、**HTTP でどこかへ送信する経路は無い**。
2. リポジトリ内に API / サーバレス関数 / シークレット管理の定義が**存在しない**ことを確認した（`js/` はすべてブラウザで動くクライアントモジュール）。
3. GitHub の issue 作成 API が認証必須であることを確認した（未認証では作成できない）。
4. 以上より、**クライアントサイドで前進できる範囲は #101 で対応済み**であり、残りは要人間対応（バックエンド）と判断した。

## 提案アーキテクチャ

「投稿プロキシ」1 本だけの最小構成です。[アンブレラ計画](issue-117-backend-implementation-plan.md)の共通基盤（API Gateway + Lambda + Secrets Manager）に乗せれば追加コストはほぼ Lambda 実行分のみです。

```
ブラウザ（GitHub Pages）
   │ POST /feedback  { category, body, imageDataUrl? }
   ▼
Amazon API Gateway (HTTP API)  ── CORS を https://kenta-matsuda.github.io に限定
   │
   ▼
AWS Lambda（Node.js）
   ├─ 入力検証 / 長さ制限 / 簡易レート制限
   ├─ AWS Secrets Manager から GitHub App の秘密鍵を取得 → インストールトークンを発行
   └─ POST /repos/{owner}/{repo}/issues （ラベル: from-app など）
```

### 設計上の判断ポイント

- **資格情報は PAT ではなく GitHub App を推奨**。権限を「この 1 リポジトリの issues: write」に絞れ、トークンは短命（1 時間）で自動失効します。PAT は権限が広く失効管理も手作業になります。
- **投稿は必ず Lambda 側で組み立てる**。クライアントから渡すのはカテゴリと本文だけにし、リポジトリ名・ラベル・タイトル書式は Lambda 内で固定します（改ざん防止）。
- **`from-app` などのラベルを必ず付ける**。代理投稿であることが後から分かるようにし、スパム時に一括処理できます。
- **画像添付（#166 の要望）も同じ経路に載せられる**。ただし GitHub の画像アップロード API は公開されていないため、実務的には次のいずれか。
  - (a) S3 に置いて**署名付き URL ではなく公開読み取りの CloudFront URL** を issue 本文に埋める（URL の推測を防ぐためランダムなキー名にする）。
  - (b) 画像を issue 本文に base64 で埋めない（本文長制限とレビュー性の観点で非推奨）。
  - どちらもストレージのライフサイクル（一定期間で削除）を決める必要があります。

### 濫用対策（バックエンドを公開する以上、必須）

認証を付けない公開エンドポイントになるため、**無認証のまま放置しないこと**を強く推奨します。少なくとも次を検討してください。

- **CAPTCHA**（AWS WAF Bot Control の CAPTCHA アクション、または reCAPTCHA / Turnstile のトークン検証を Lambda 側で行う）。
- **AWS WAF のレートベースルール**（IP 単位）＋ API Gateway のスロットリング。
- **本文長・添付サイズの上限**、リンク数の上限、明らかなスパム語のブロック。
- **投稿の一時停止スイッチ**（環境変数フラグ）を用意し、荒らされたら即座に止められるようにする。

これらが無いと、リポジトリの issues が第三者から自由に書き込める状態になります。**この判断は人間が明示的に行ってください。**

## 要人間対応事項

⚠️ 要人間対応: AWS操作が必要

- 必要な操作内容:
  1. GitHub App を作成し、対象リポジトリにインストールする（権限: Issues = Read & Write のみ）。秘密鍵（PEM）を取得する。
  2. 秘密鍵を Secrets Manager に保管する。
  3. Lambda 関数（投稿プロキシ）と API Gateway（HTTP API）を作成し、CORS を GitHub Pages のオリジンに限定する。
  4. WAF / CAPTCHA / スロットリングの方針を決めて適用する。
  5. 監視（CloudWatch Logs / アラーム）と課金上限の方針を決める。
- 対象リソース: Secrets Manager シークレット 1 個、Lambda 関数 1 個、API Gateway HTTP API 1 個、（画像対応する場合）S3 バケット + CloudFront 1 セット、WAF Web ACL 1 個
- 想定コマンド（**未実行の提案**）:

```bash
# 1) GitHub App の秘密鍵を保管
aws secretsmanager create-secret \
  --name asn/github-app \
  --secret-string '{"appId":"<APP_ID>","installationId":"<INSTALLATION_ID>","privateKey":"<PEM>"}'

# 2) Lambda 実行ロール（Secrets 読み取り + ログ）
aws iam create-role --role-name asn-feedback-proxy-role \
  --assume-role-policy-document file://trust-lambda.json
aws iam attach-role-policy --role-name asn-feedback-proxy-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam put-role-policy --role-name asn-feedback-proxy-role \
  --policy-name read-github-app-secret \
  --policy-document file://policy-secrets-read.json

# 3) Lambda 関数
aws lambda create-function \
  --function-name asn-feedback-proxy \
  --runtime nodejs22.x --handler index.handler \
  --role arn:aws:iam::<ACCOUNT_ID>:role/asn-feedback-proxy-role \
  --zip-file fileb://feedback-proxy.zip \
  --environment 'Variables={GITHUB_OWNER=Kenta-Matsuda,GITHUB_REPO=Kenta-Matsuda.github.io-aws-study,SECRET_NAME=asn/github-app,ENABLED=true}'

# 4) HTTP API（CORS をオリジン限定）
aws apigatewayv2 create-api \
  --name asn-feedback-api --protocol-type HTTP \
  --target arn:aws:lambda:<REGION>:<ACCOUNT_ID>:function:asn-feedback-proxy \
  --cors-configuration 'AllowOrigins=https://kenta-matsuda.github.io,AllowMethods=POST,AllowHeaders=content-type'
```

## エージェント側で対応できる作業（バックエンドができたら）

- **[エージェント可]** `js/config.js` にエンドポイント設定を追加し、未設定なら**従来どおりの GitHub 遷移 / コピー経路にフォールバック**するクライアントモジュールを実装する（設定が無い環境で壊れない）。
- **[エージェント可]** フィードバックモーダルに「アプリから直接送信」ボタンを追加し、送信中 / 成功 / 失敗の表示と、失敗時のコピー経路への案内を実装する。
- **[エージェント可]** CAPTCHA ウィジェットの組み込み（採用する方式が決まり次第）。
- **[エージェント可]** Playwright で `page.route` によりエンドポイントをスタブし、成功 / 失敗 / 未設定の 3 経路を回帰テストする。

## 次のアクション（人間）

1. **公開エンドポイントを持つ判断**（濫用対策込み）をするかを決める。
2. する場合は上記の GitHub App + Lambda + WAF の方針を確定する。
3. エンドポイント URL と CAPTCHA 方式が決まった時点で、クライアント側の実装をエージェントに依頼する（上記「エージェント可」の項目）。
