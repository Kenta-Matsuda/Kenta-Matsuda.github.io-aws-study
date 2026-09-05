# AWS Study Navigator

[![Live Demo](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://kenta-matsuda.github.io/Kenta-Matsuda.github.io-aws-study/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
![visitor badge](https://visitor-badge.laobi.icu/badge?page_id=Kenta-Matsuda.github.io-aws-study&left_text=visitors)

**AWS認定全13資格に対応した、無料の学習ナビゲーター。**  
試験ガイドに基づくドメイン別ロードマップと、AI搭載クイズで効率的に合格を目指せます。

**https://kenta-matsuda.github.io/Kenta-Matsuda.github.io-aws-study/**

---

## 対応資格

| レベル | コード | 正式名称 |
|--------|--------|----------|
| Foundational | CLF-C02 | AWS Certified Cloud Practitioner |
| Foundational | AIF-C01 | AWS Certified AI Practitioner |
| Foundational | AIB-C01 | AWS Certified AI Business Strategist |
| Associate | SAA-C03 | AWS Certified Solutions Architect – Associate |
| Associate | DVA-C02 | AWS Certified Developer – Associate |
| Associate | SOA-C03 | AWS Certified CloudOps Engineer – Associate |
| Associate | DEA-C01 | AWS Certified Data Engineer – Associate |
| Associate | MLA-C01 | AWS Certified Machine Learning Engineer – Associate |
| Professional | SAP-C02 | AWS Certified Solutions Architect – Professional |
| Professional | DOP-C02 | AWS Certified DevOps Engineer – Professional |
| Professional | AIP-C01 | AWS Certified Generative AI Developer – Professional |
| Specialty | ANS-C01 | AWS Certified Advanced Networking – Specialty |
| Specialty | SCS-C03 | AWS Certified Security – Specialty |
| Business | AIB-C01 | AWS Certified AI Business Strategist |

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
