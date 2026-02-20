export const MILESTONES = [
  { id: 'beginner', xp: 0, title: 'ビギナー' },
  { id: 'rookie', xp: 10, title: 'ルーキー' },
  { id: 'architect', xp: 100, title: '見習いアーキテクト' },
  { id: 'solution_architect', xp: 200, title: 'ソリューションアーキテクト' },
  { id: 'senior_architect', xp: 500, title: '上級アーキテクト' },
  { id: 'specialist', xp: 1000, title: 'AWSスペシャリスト' },
  { id: 'master', xp: 5000, title: 'AWSマスター' },
  { id: 'king', xp: 10000, title: 'AWSキング' },
  { id: 'sage', xp: 100000, title: 'AWS大賢者' },
];

export function getMilestoneStatus(totalXp) {
  const xp = Number(totalXp || 0);

  let current = MILESTONES[0];
  for (const m of MILESTONES) {
    if (xp >= m.xp) current = m;
  }

  const currentIndex = MILESTONES.findIndex((m) => m.id === current.id);
  const next = currentIndex >= 0 ? MILESTONES[currentIndex + 1] : undefined;

  if (!next) {
    return {
      current,
      next: null,
      progress01: 1,
      remainingXp: 0,
    };
  }

  const span = Math.max(1, next.xp - current.xp);
  const within = Math.min(span, Math.max(0, xp - current.xp));

  return {
    current,
    next,
    progress01: within / span,
    remainingXp: Math.max(0, next.xp - xp),
  };
}

export function getNewlyUnlockedMilestones(prevXp, nextXp) {
  const before = Number(prevXp || 0);
  const after = Number(nextXp || 0);
  if (after <= before) return [];

  return MILESTONES.filter((m) => m.xp > before && m.xp <= after);
}
