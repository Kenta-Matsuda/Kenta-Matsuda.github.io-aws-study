import { PUBLIC_EXAM_IDS } from './config.js';

import { ANS_C01 } from './data/ans-c01.js';


export const ALL_EXAMS = [
  ANS_C01,
];

const EXAM_BY_ID = new Map(ALL_EXAMS.map((e) => [e.id, e]));

export function getExamById(examId) {
  const exam = EXAM_BY_ID.get(examId);
  if (!exam) throw new Error(`Unknown examId: ${examId}`);
  return exam;
}

export function getPublicExams() {
  return PUBLIC_EXAM_IDS.map(getExamById);
}
