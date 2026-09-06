# Issue: 要人間対応事項をチェックリスト一覧としてリポジトリ上で可視化する (#184)

## 概要

> 人間側の要対応事項がチェックリストの一覧になってリポジトリ上で見えるようになっていてほしい

`docs/action-required/` には AWS 操作など「人間しか実施できない要対応事項」が構造化して蓄積されて
いますが、`README.md` の箇条書きだけでは「未対応が何件残っているか」「何が完了したか」を
チェックリストとして一目で把握しづらい状態でした。

## 対応

### 1. チェックリストの生成スクリプト（`scripts/list-action-required.mjs`）

`docs/action-required/` 配下の各 Markdown を走査し、**冒頭のステータス行**（`🔴 未対応` / `🟡 対応中` /
`🟢`・`✅ 完了`）・タイトル・種別・関連 issue を機械的に抽出して、チェックボックス付きの一覧を生成します。

- ステータス判定はタイトル行（例: 「完了時のプッシュ通知」のように本文語として『完了』を含みうる）を
  除外し、**専用ステータス行の行頭絵文字だけ**で行うため誤判定しません。
- 読み取り専用が原則。`--write` を付けたときだけ `docs/action-required/CHECKLIST.md` を再生成します。
  `--check` は最新かどうかを検証し、差分があれば非ゼロ終了します（CI などで最新性を担保できる）。
- 外部依存なし（Node 標準モジュールのみ）。

```
node scripts/list-action-required.mjs            # 標準出力にプレビュー
node scripts/list-action-required.mjs --write     # CHECKLIST.md を再生成
node scripts/list-action-required.mjs --check      # 最新かどうかを検証
```

### 2. チェックリスト本体（`docs/action-required/CHECKLIST.md`）

生成された一覧をリポジトリにコミットしておくことで、GitHub 上でそのままチェックリストとして
閲覧できます。「未対応（要対応）」と「完了」でセクションを分け、件数サマリを冒頭に出します。

### 3. 索引・README の更新

- `docs/action-required/README.md` にチェックリストへの導線と再生成コマンドを追記。
- `docs/index.md` の要人間対応セクションにチェックリストへのリンクを追加。

## 実装上の判断

- **元ファイルを単一の真実源とする**: チェックリストは生成物なので手編集しない運用にした。項目を
  足すときは従来どおり `docs/action-required/` にファイルを追加し、スクリプトで再生成する。これにより
  README の一覧とチェックリストが二重管理でずれるのを防ぐ。
- GitHub のタスクリスト記法（`- [ ]` / `- [x]`）は、この**ドキュメント上のチェックリスト表示が目的**
  なので用いる（PR 本文でのタスクリスト記法禁止は、PR の進捗誤集計を避けるためのものであり、docs 内の
  チェックリストは対象外）。

## 検証

- `node --check scripts/list-action-required.mjs` — OK
- `node scripts/list-action-required.mjs --write` → `--check` が「up to date」を返す（冪等）ことを確認
- 生成結果を目視確認し、全 9 件が正しく「未対応」に分類され、タイトルに『完了』を含むファイルが
  誤って「完了」に入らないことを確認
- 相対リンク（CHECKLIST から各ファイル、README / index からの導線）が実在ファイルを指すことを確認
