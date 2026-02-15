![visitor badge](https://visitor-badge.laobi.icu/badge?page_id=Kenta-Matsuda.github.io-aws-study&left_text=PageViews)

# AWS認定 合格ナビゲーター

AWS認定試験の学習サイトです。
分野別の知識項目を、公式の良質な学習リソースで勉強できます。
Gemini API を設定すると「用語の解説」や「模擬問題」などのAI機能を利用できます。

現在はα版として **ANS-C01** のみを公開しています。

## 使い方

1. 公開されているサイト（GitHub Pages）にアクセスします
2. 画面右上の **試験ボタン** で試験を切り替えます
3. 画面上部のタブで **ドメイン** を切り替え、タスク一覧を確認します
4. 良質な公式リソースで学習を加速させます

## ローカルで動作させる場合

ローカルで利用したい場合は Node.js で簡易サーバを起動します。

- 起動: `node dev-server.mjs`
- アクセス先: `http://localhost:8000/`

オプション:

- ポート指定: `node dev-server.mjs --port 8001`
- キャッシュ無効: `node dev-server.mjs --no-cache`

## AI 機能について

Gemini API キーを設定すると、以下のAI機能を利用できます。

- 用語や概念のAI解説
- AIによる模擬問題生成

### 利用手順

1. 画面右上の **API Key（⚙️）** を開く
2. **Google Gemini API Key** を入力して保存
3. 各項目のボタンを押す

※ API キーはブラウザの LocalStorage に保存されます。共有PCなどではキーの削除を推奨します。

## 自分用にカスタマイズ

このリポジトリは、フォークして独自の学習サイトに作り替えることも可能です。

- 試験データは `js/data/*.js` に分割されているので、フォーク後に自分用データへ差し替え/追加できます
- 公開する試験は `js/config.js` の `PUBLIC_EXAM_IDS` で制御できます
