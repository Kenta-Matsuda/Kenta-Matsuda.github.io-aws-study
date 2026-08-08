# AWS Study Navigator

[![Live Demo](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://kenta-matsuda.github.io/Kenta-Matsuda.github.io-aws-study/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
![visitor badge](https://visitor-badge.laobi.icu/badge?page_id=Kenta-Matsuda.github.io-aws-study&left_text=visitors)

**AWS認定全12資格に対応した、無料の学習ナビゲーター。**  
試験ガイドに基づくドメイン別ロードマップと、AI搭載クイズで効率的に合格を目指せます。

**https://kenta-matsuda.github.io/Kenta-Matsuda.github.io-aws-study/**

---

## 対応資格

| レベル | 資格 |
|--------|------|
| Foundational | CLF-C02 / AIF-C01 |
| Associate | SAA-C03 / DVA-C02 / SOA-C03 / DEA-C01 / MLA-C01 / AIP-C01 |
| Professional | SAP-C02 / DOP-C02 |
| Specialty | ANS-C01 / SCS-C03 |

## 主な機能

- **ドメイン別学習ロードマップ** — 試験ガイド準拠のタスク・知識項目と公式リソースリンク
- **AI搭載クイズ** — 5問 / スピードラン / 模擬試験 / スマート復習の4モード
- **XP & 称号** — 学習を積み上げるゲーミフィケーション
- **スキルレーダー** — ドメイン別の強み・弱みを可視化
- **AIチューター** — チャットでAWSの疑問をすぐ解決
- **日本語 / 英語対応**

## 使い方

1. [サイトにアクセス](https://kenta-matsuda.github.io/Kenta-Matsuda.github.io-aws-study/)
2. 右上の試験ボタンから受験予定の資格を選択
3. ドメインタブで学習範囲を確認し、公式リソースで学習
4. AIクイズで理解度をチェック（API Key設定が必要）
5. XPを貯めて称号をアンロック！

## AI機能の設定

画面右上の **⚙️ API Key** から設定できます。

| プロバイダ | 対象 | 料金 |
|-----------|------|------|
| Google Gemini | 18歳以上 | 無料枠あり |
| OpenAI | 全年齢（未成年は保護者同意要） | 従量課金 |

> API キーはブラウザ内のみに保存され、外部サーバーには送信されません。

## ローカル起動

```bash
node dev-server.mjs
# http://localhost:8000/
```

## Contributing

Issue・Pull Request 歓迎です。詳しくは [CONTRIBUTING.md](./CONTRIBUTING.md) をご覧ください。

## License

[MIT](./LICENSE)
