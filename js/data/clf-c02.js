export const CLF_C02 = {
  id: 'clf-c02',
  code: 'CLF-C02',
  shortLabel: 'CLF',
  title: 'AWS CLF-C02 Exam Guide & Resources',
  subtitle: 'Cloud Practitioner 向け: 重要概念をドメイン別に整理',
  domains: [
    {
      id: 1,
      title: 'Cloud Concepts',
      jpTitle: '第1分野: クラウドの概念',
      weight: 26,
      color: '#3b82f6',
      description: 'クラウドの価値、基本概念、アーキテクチャの概要。',
      tasks: [
        {
          id: '1.1',
          title: 'Define the AWS Cloud value proposition',
          jpTitle: 'AWSクラウドの価値提案を説明する',
          knowledge: ['Well-Architected Framework (overview)', 'Elasticity vs scalability', 'CAPEX vs OPEX'],
          blogs: [
            {
              title: 'AWS Well-Architected Framework',
              url: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html',
              note: 'Official Docs',
            },
          ],
        },
      ],
    },
    {
      id: 2,
      title: 'Security and Compliance',
      jpTitle: '第2分野: セキュリティとコンプライアンス',
      weight: 25,
      color: '#10b981',
      description: '責任共有モデル、IAM、基本的なセキュリティ。',
      tasks: [
        {
          id: '2.1',
          title: 'Define the shared responsibility model',
          jpTitle: '責任共有モデルを説明する',
          knowledge: ['Shared responsibility model', 'IAM basics (users, roles, policies)', 'MFA'],
          blogs: [
            {
              title: '責任共有モデル',
              url: 'https://aws.amazon.com/jp/compliance/shared-responsibility-model/',
              note: 'Official Page',
            },
          ],
        },
      ],
    },
  ],
};
