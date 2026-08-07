import { PUBLIC_EXAM_IDS } from './config.js';

import { CLF_C02 } from './data/clf-c02.js';
import { AIF_C01 } from './data/aif-c01.js';
import { SAA_C03 } from './data/saa-c03.js';
import { SAP_C02 } from './data/sap-c02.js';
import { ANS_C01 } from './data/ans-c01.js';
import { DVA_C02 } from './data/dva-c02.js';
import { MLA_C01 } from './data/mla-c01.js';
import { DEA_C01 } from './data/dea-c01.js';
import { SOA_C03 } from './data/soa-c03.js';
import { DOP_C02 } from './data/dop-c02.js';
import { AIP_C01 } from './data/aip-c01.js';
import { SCS_C03 } from './data/scs-c03.js';


export const ALL_EXAMS = [
  CLF_C02,
  AIF_C01,
  SAA_C03,
  SAP_C02,
  ANS_C01,
  DVA_C02,
  MLA_C01,
  DEA_C01,
  SOA_C03,
  DOP_C02,
  AIP_C01,
  SCS_C03,
];

/**
 * Exam categories with display order.
 * Each category contains exam IDs belonging to that level.
 */
export const EXAM_CATEGORIES = [
  {
    id: 'foundational',
    labelJa: 'Foundational',
    labelEn: 'Foundational',
    icon: 'fas fa-seedling',
    examIds: ['clf-c02', 'aif-c01'],
  },
  {
    id: 'associate',
    labelJa: 'Associate',
    labelEn: 'Associate',
    icon: 'fas fa-user-graduate',
    examIds: ['saa-c03', 'dva-c02', 'soa-c03', 'mla-c01', 'dea-c01', 'aip-c01'],
  },
  {
    id: 'professional',
    labelJa: 'Professional',
    labelEn: 'Professional',
    icon: 'fas fa-award',
    examIds: ['sap-c02', 'dop-c02'],
  },
  {
    id: 'specialty',
    labelJa: 'Specialty',
    labelEn: 'Specialty',
    icon: 'fas fa-star',
    examIds: ['ans-c01', 'scs-c03'],
  },
];

/**
 * Short hash code to exam ID mapping for URL routing.
 * e.g. #clf -> clf-c02, #saa -> saa-c03
 */
export const EXAM_HASH_MAP = {
  'clf': 'clf-c02',
  'aif': 'aif-c01',
  'saa': 'saa-c03',
  'sap': 'sap-c02',
  'ans': 'ans-c01',
  'dva': 'dva-c02',
  'mla': 'mla-c01',
  'dea': 'dea-c01',
  'soa': 'soa-c03',
  'dop': 'dop-c02',
  'aip': 'aip-c01',
  'scs': 'scs-c03',
};

/** Reverse map: exam ID -> hash code */
export const EXAM_ID_TO_HASH = Object.fromEntries(
  Object.entries(EXAM_HASH_MAP).map(([hash, id]) => [id, hash])
);

const EXAM_BY_ID = new Map(ALL_EXAMS.map((e) => [e.id, e]));

export function getExamById(examId) {
  const exam = EXAM_BY_ID.get(examId);
  if (!exam) throw new Error(`Unknown examId: ${examId}`);
  return exam;
}

export function getPublicExams() {
  return PUBLIC_EXAM_IDS.map(getExamById);
}

/**
 * Resolve a URL hash (without #) to an exam ID.
 * Supports both short codes (clf) and full IDs (clf-c02).
 */
export function resolveExamFromHash(hash) {
  if (!hash) return null;
  const normalized = hash.toLowerCase().replace(/^#/, '');
  // Special: beginner guide
  if (normalized === 'beginner') return '__beginner__';
  // Try short code first
  if (EXAM_HASH_MAP[normalized]) return EXAM_HASH_MAP[normalized];
  // Try full exam ID
  if (EXAM_BY_ID.has(normalized)) return normalized;
  return null;
}
