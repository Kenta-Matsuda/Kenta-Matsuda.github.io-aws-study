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
import { AIB_C01 } from './data/aib-c01.js';


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
  AIB_C01,
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
    examIds: ['saa-c03', 'dva-c02', 'soa-c03', 'mla-c01', 'dea-c01'],
  },
  {
    id: 'professional',
    labelJa: 'Professional',
    labelEn: 'Professional',
    icon: 'fas fa-award',
    examIds: ['sap-c02', 'dop-c02', 'aip-c01'],
  },
  {
    id: 'specialty',
    labelJa: 'Specialty',
    labelEn: 'Specialty',
    icon: 'fas fa-star',
    examIds: ['ans-c01', 'scs-c03'],
  },
  {
    id: 'business',
    labelJa: 'Business',
    labelEn: 'Business',
    icon: 'fas fa-briefcase',
    examIds: ['aib-c01'],
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
  'aib': 'aib-c01',
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
 * Resolve the category/level label for an exam ID.
 * Null-safe: returns null when examId is falsy or does not belong to any category.
 * @param {string} examId
 * @returns {{ id: string, labelJa: string, labelEn: string } | null}
 */
export function getExamCategoryLabel(examId) {
  if (!examId) return null;
  const category = EXAM_CATEGORIES.find((c) => c.examIds.includes(examId));
  if (!category) return null;
  return { id: category.id, labelJa: category.labelJa, labelEn: category.labelEn };
}

/**
 * Resource group keys inside `js/data/*.js` that point at AWS's own primary
 * sources for an exam's identity (official exam page / official exam guide).
 * Order matters: the exam guide is the most authoritative document for
 * existence, official name, exam code, domains and weightings.
 */
const AUTHORITATIVE_RESOURCE_KEYS = ['guide', 'official-page'];

/** Hosts accepted as AWS primary sources (keeps arbitrary URLs out of tool calls). */
const AWS_PRIMARY_SOURCE_HOSTS = [
  'docs.aws.amazon.com',
  'aws.amazon.com',
  'd1.awsstatic.com',
];

function isAwsPrimarySourceUrl(url) {
  try {
    const { protocol, hostname } = new URL(String(url));
    if (protocol !== 'https:') return false;
    return AWS_PRIMARY_SOURCE_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * Collect the AWS official (primary source) URLs declared for an exam in
 * `js/data/*.js` – the official exam guide and the official exam page.
 *
 * These are the URLs handed to the model so it can verify facts about the exam
 * itself (existence, official name, exam code, scope) against AWS documentation
 * instead of relying on its internal knowledge.
 *
 * Null-safe: returns an empty array for a falsy or unknown exam ID.
 *
 * @param {string} examId
 * @param {{ locale?: string }} [opts]
 * @returns {Array<{ key: string, title: string, url: string }>}
 */
export function getExamOfficialRefs(examId, { locale = 'ja' } = {}) {
  if (!examId) return [];

  let exam;
  try {
    exam = getExamById(examId);
  } catch {
    return [];
  }

  const refs = [];
  const seenUrls = new Set();

  for (const key of AUTHORITATIVE_RESOURCE_KEYS) {
    const items = [];
    for (const step of Array.isArray(exam.steps) ? exam.steps : []) {
      for (const group of Array.isArray(step?.resources) ? step.resources : []) {
        if (group?.key !== key) continue;
        for (const item of Array.isArray(group?.items) ? group.items : []) {
          if (item) items.push(item);
        }
      }
    }
    if (!items.length) continue;

    // Prefer the explicitly recommended entry, otherwise the first one.
    const preferred = items.find((i) => i.recommend === true) || items[0];
    const url =
      locale === 'en'
        ? preferred.urlEn || preferred.url
        : preferred.url || preferred.urlEn;
    if (!url || seenUrls.has(url) || !isAwsPrimarySourceUrl(url)) continue;

    seenUrls.add(url);
    refs.push({
      key,
      title: (locale === 'en' ? preferred.titleEn || preferred.title : preferred.title) || url,
      url,
    });
  }

  return refs;
}

/**
 * Matches AWS service names that appear in the exam data text, e.g.
 * "Amazon Bedrock", "Amazon SageMaker AI", "Amazon Quick", "AWS Glue".
 * The trailing group greedily captures multi-word service names
 * (proper-cased words or ALL-CAPS acronyms) that follow the "Amazon"/"AWS" prefix.
 */
const AWS_SERVICE_NAME_RE = /\b(?:Amazon|AWS)(?:\s+(?:[A-Z][A-Za-z0-9]*|[A-Z]{2,}))+/g;

/** Name prefixes that are programs/frameworks/marketing, not AWS services, filtered out. */
const NON_SERVICE_FRAGMENTS = [
  'AWS Certified',
  'AWS Certification',
  'AWS Training',
  'AWS Skill Builder',
  'AWS Cloud Adoption Framework',
  'AWS Well',
  'AWS Blog',
  'AWS Black Belt',
  'AWS Decision Guide',
  'AWS Executive Insights',
  'AWS Security Best Practices',
  'AWS Compliance Programs',
  'AWS Global Infrastructure',
  'AWS Cloud Practitioner',
  'AWS Pricing Works',
];

/** Exact names that are too generic to be a specific service, filtered out. */
const NON_SERVICE_EXACT = new Set([
  'Amazon Web Services',
  'AWS Cloud',
  'AWS Services',
  'AWS AI Services',
  'AWS Compliance',
  'AWS Responsible AI',
  'AWS Responsible AI Resources',
]);

/** Upper bound on injected keywords so the system prompt stays compact. */
const MAX_SERVICE_KEYWORDS = 25;

/**
 * Collect the in-scope AWS service names referenced by an exam's data
 * (`js/data/*.js`) so they can be injected into the chat system prompt as
 * grounding context. This surfaces the exam guide's target-service list to the
 * model, which matters for services that are newer than the model's training
 * cutoff (e.g. Amazon Quick, released 2026) and would otherwise be misidentified.
 *
 * Service names are harvested from the human-readable text of the exam
 * definition (step/domain/task `knowledge` bullets and resource notes/titles),
 * matched against the "Amazon …" / "AWS …" naming convention, de-duplicated,
 * and capped so the prompt stays compact. Program/exam names such as
 * "AWS Certified …" are excluded.
 *
 * Null-safe: returns an empty array for a falsy or unknown exam ID.
 *
 * @param {string} examId
 * @param {{ locale?: string }} [opts]
 * @returns {string[]} de-duplicated AWS service names, in first-seen order
 */
export function getExamServiceKeywords(examId, { locale = 'ja' } = {}) {
  if (!examId) return [];

  let exam;
  try {
    exam = getExamById(examId);
  } catch {
    return [];
  }

  const preferEn = locale === 'en';
  const seen = new Set();
  const keywords = [];

  const harvest = (value) => {
    if (typeof value !== 'string' || keywords.length >= MAX_SERVICE_KEYWORDS) return;
    const matches = value.match(AWS_SERVICE_NAME_RE);
    if (!matches) return;
    for (const raw of matches) {
      const name = raw.trim();
      if (NON_SERVICE_EXACT.has(name)) continue;
      if (NON_SERVICE_FRAGMENTS.some((frag) => name === frag || name.startsWith(`${frag} `))) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      keywords.push(name);
      if (keywords.length >= MAX_SERVICE_KEYWORDS) return;
    }
  };

  // Prefer the locale-specific field, falling back to the other locale.
  const harvestPair = (obj, jaKey, enKey) => {
    if (!obj) return;
    const primary = preferEn ? obj[enKey] : obj[jaKey];
    const fallback = preferEn ? obj[jaKey] : obj[enKey];
    for (const field of [primary, fallback]) {
      if (Array.isArray(field)) field.forEach(harvest);
      else harvest(field);
    }
  };

  const harvestResources = (resources) => {
    for (const group of Array.isArray(resources) ? resources : []) {
      for (const item of Array.isArray(group?.items) ? group.items : []) {
        harvestPair(item, 'note', 'noteEn');
        harvestPair(item, 'title', 'titleEn');
      }
    }
  };

  for (const step of Array.isArray(exam.steps) ? exam.steps : []) {
    harvestPair(step, 'knowledge', 'knowledgeEn');
    harvestResources(step?.resources);
  }
  for (const domain of Array.isArray(exam.domains) ? exam.domains : []) {
    for (const task of Array.isArray(domain?.tasks) ? domain.tasks : []) {
      harvestPair(task, 'knowledge', 'knowledgeEn');
      harvestResources(task?.resources);
    }
  }

  return keywords;
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
