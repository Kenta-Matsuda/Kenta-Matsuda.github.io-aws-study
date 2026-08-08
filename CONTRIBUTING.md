# Contributing

AWS Study Navigator へのコントリビューションを歓迎します！

## How to Contribute

### Bug Reports / Feature Requests

[GitHub Issues](https://github.com/Kenta-Matsuda/Kenta-Matsuda.github.io-aws-study/issues) から報告してください。テンプレートに従って記入いただけるとスムーズです。

### Pull Requests

1. このリポジトリをフォーク
2. feature ブランチを作成 (`git checkout -b feature/your-feature`)
3. 変更をコミット (`git commit -m "feat: add your feature"`)
4. ブランチをプッシュ (`git push origin feature/your-feature`)
5. Pull Request を作成

### Development Setup

```bash
git clone https://github.com/YOUR_USERNAME/Kenta-Matsuda.github.io-aws-study.git
cd Kenta-Matsuda.github.io-aws-study
node dev-server.mjs
```

ブラウザで `http://localhost:8000/` にアクセスして動作確認できます。

## Guidelines

- コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/) に従ってください
- JavaScript は ES Modules 形式で記述してください
- 新しい試験データを追加する場合は `js/data/` に既存ファイルと同じ形式で作成してください
- 日本語・英語の両方の翻訳を `js/locales/` に追加してください

## Code of Conduct

このプロジェクトは [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md) に準拠しています。参加する全ての方にこの行動規範の遵守をお願いします。
