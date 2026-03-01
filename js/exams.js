import { PUBLIC_EXAM_IDS } from './config.js';

import { CLF_C02 } from './data/clf-c02.js';
import { AIF_C01 } from './data/aif-c01.js';
import { SAA_C03 } from './data/saa-c03.js';
import { SAP_C02 } from './data/sap-c02.js';
import { ANS_C01 } from './data/ans-c01.js';


export const ALL_EXAMS = [
  CLF_C02,
  AIF_C01,
  SAA_C03,
  SAP_C02,
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
