export function createPlaceholderExam({ id, code, shortLabel, title }) {
  return {
    id,
    code,
    shortLabel,
    title,
    subtitle: '（この試験のデータは未登録です。必要に応じて追加してください）',
    domains: [],
  };
}
