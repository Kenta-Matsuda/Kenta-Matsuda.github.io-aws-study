import { test, expect } from '@playwright/test';
import {
  collectResourceItems,
  buildResourceLinksMarkdown,
  buildResourceLinksCsv,
  buildStudyRouteMarkdown,
  buildGlossaryCsv,
  RESOURCE_CSV_HEADERS,
  GLOSSARY_CSV_HEADERS,
} from '../js/studyPack.js';
import { ALL_EXAMS } from '../js/exams.js';

// Pure-logic spec (no browser) for issue #165: turn the static exam data into
// NotebookLM-ready study assets (per-domain resource link lists in Markdown/CSV,
// a study-route Markdown and a glossary CSV). The generators are split into
// js/studyPack.js as pure functions so they can be unit-tested without a browser,
// the same pattern as js/quizCsv.js.

/** Small hand-built fixture exam (does NOT depend on the large real data files). */
function makeFixtureExam() {
  return {
    id: 'fix-c01',
    code: 'FIX-C01',
    title: 'Fixture Exam',
    subtitle: 'A tiny fixture',
    subtitleEn: 'A tiny fixture (en)',
    steps: [
      {
        id: 'step-1',
        title: 'Overview',
        jpTitle: '概要',
        description: ['範囲を理解する'],
        descriptionEn: ['Understand the scope'],
        knowledge: ['クラウドの基礎', '責任共有モデル'],
        knowledgeEn: ['Cloud basics', 'Shared responsibility model'],
        resources: [
          {
            key: 'guide',
            label: '試験ガイド',
            labelEn: 'Exam Guide',
            items: [
              {
                title: 'ガイド, PDF',
                titleEn: 'Guide "PDF"',
                url: 'https://example.com/guide',
                urlEn: 'https://example.com/guide-en',
                note: 'note, with comma',
                noteEn: 'note "quoted"',
                recommend: true,
              },
              // duplicate url (ja) — must be de-duplicated
              {
                title: 'Duplicate',
                url: 'https://example.com/guide',
                note: 'dup',
              },
            ],
          },
        ],
      },
      {
        id: 'step-2',
        title: 'Compute',
        jpTitle: 'コンピューティング',
        description: ['EC2 を学ぶ'],
        descriptionEn: ['Learn EC2'],
        resources: [
          {
            key: 'docs',
            label: 'ドキュメント',
            labelEn: 'Docs',
            items: [
              {
                title: 'EC2 Docs',
                url: 'https://example.com/ec2',
                note: 'compute',
              },
            ],
          },
        ],
      },
    ],
  };
}

test.describe('studyPack resource extraction (#165)', () => {
  test('collectResourceItems de-duplicates repeated URLs', () => {
    const items = collectResourceItems(makeFixtureExam(), { locale: 'ja' });
    const urls = items.map((i) => i.url);
    expect(urls).toEqual(['https://example.com/guide', 'https://example.com/ec2']);
    expect(new Set(urls).size).toBe(urls.length);
  });

  test('collectResourceItems switches to English fields when locale=en', () => {
    const items = collectResourceItems(makeFixtureExam(), { locale: 'en' });
    const guide = items.find((i) => i.url === 'https://example.com/guide-en');
    expect(guide).toBeTruthy();
    expect(guide.title).toBe('Guide "PDF"');
    expect(guide.stepTitle).toBe('Overview');
  });
});

test.describe('buildResourceLinksMarkdown (#165)', () => {
  test('emits a Markdown link for each unique url under its step heading', () => {
    const md = buildResourceLinksMarkdown(makeFixtureExam(), { locale: 'ja' });
    expect(md).toContain('# FIX-C01 - Fixture Exam 参考リンク集');
    expect(md).toContain('## 概要');
    expect(md).toContain('## コンピューティング');
    expect(md).toContain('- [ガイド, PDF](https://example.com/guide)');
    expect(md).toContain('- [EC2 Docs](https://example.com/ec2)');
    // duplicate url must not appear twice
    const occurrences = md.split('https://example.com/guide)').length - 1;
    expect(occurrences).toBe(1);
  });

  test('uses English step headings and links when locale=en', () => {
    const md = buildResourceLinksMarkdown(makeFixtureExam(), { locale: 'en' });
    expect(md).toContain('## Overview');
    expect(md).toContain('## Compute');
    expect(md).toContain('(https://example.com/guide-en)');
  });

  test('accepts an exam array and produces an all-exams Markdown with per-exam H2 sections', () => {
    const examA = makeFixtureExam();
    const examB = {
      id: 'fix-c02', code: 'FIX-C02', title: 'Second Exam',
      steps: [{
        id: 's1', title: 'Storage', jpTitle: 'ストレージ',
        resources: [{ key: 'docs', label: 'ドキュメント', items: [
          { title: 'S3 Docs', url: 'https://example.com/s3', note: 's3 note' },
        ]}],
      }],
    };
    const md = buildResourceLinksMarkdown([examA, examB], { locale: 'ja' });
    expect(md).toContain('# 全試験 - 参考リンク集');
    expect(md).toContain('## FIX-C01 - Fixture Exam');
    expect(md).toContain('## FIX-C02 - Second Exam');
    expect(md).toContain('### 概要');
    expect(md).toContain('- [S3 Docs](https://example.com/s3)');
  });
});

test.describe('buildResourceLinksCsv (#165)', () => {
  test('uses CRLF, a stable header row, and escapes commas/quotes', () => {
    const csv = buildResourceLinksCsv(makeFixtureExam(), { locale: 'ja' });
    expect(csv).toContain('\r\n');
    const lines = csv.replace(/\r\n$/, '').split('\r\n');
    expect(lines[0]).toBe(RESOURCE_CSV_HEADERS.join(','));
    // title "ガイド, PDF" contains a comma → must be quoted, note contains a comma too
    expect(lines[1]).toContain('"ガイド, PDF"');
    expect(lines[1]).toContain('"note, with comma"');
    // header + 2 unique rows (dup url dropped)
    expect(lines).toHaveLength(3);
  });

  test('escapes embedded quotes per RFC 4180 for the English fields', () => {
    const csv = buildResourceLinksCsv(makeFixtureExam(), { locale: 'en' });
    const lines = csv.replace(/\r\n$/, '').split('\r\n');
    expect(lines[1]).toContain('"Guide ""PDF"""');
    expect(lines[1]).toContain('"note ""quoted"""');
  });

  test('accepts an exam array and concatenates rows from all exams', () => {
    const examA = makeFixtureExam();
    const examB = {
      id: 'fix-c02', code: 'FIX-C02', title: 'Second Exam',
      steps: [{
        id: 's1', title: 'Storage', jpTitle: 'ストレージ',
        resources: [{ key: 'docs', label: 'ドキュメント', items: [
          { title: 'S3 Docs', url: 'https://example.com/s3', note: 's3 note' },
        ]}],
      }],
    };
    const csv = buildResourceLinksCsv([examA, examB], { locale: 'ja' });
    const lines = csv.replace(/\r\n$/, '').split('\r\n');
    // header + 2 from examA + 1 from examB = 4 lines
    expect(lines).toHaveLength(4);
    expect(lines[3]).toContain('FIX-C02');
    expect(lines[3]).toContain('S3 Docs');
  });
});

test.describe('buildStudyRouteMarkdown (#165)', () => {
  test('includes each step title and its knowledge bullets', () => {
    const md = buildStudyRouteMarkdown(makeFixtureExam(), { locale: 'ja' });
    expect(md).toContain('# FIX-C01 - Fixture Exam 学習ルート');
    expect(md).toContain('## ステップ 1: 概要');
    expect(md).toContain('## ステップ 2: コンピューティング');
    expect(md).toContain('- クラウドの基礎');
    expect(md).toContain('- 責任共有モデル');
    // step-2 has no knowledge → falls back to its description
    expect(md).toContain('- EC2 を学ぶ');
  });

  test('switches to English fields when locale=en', () => {
    const md = buildStudyRouteMarkdown(makeFixtureExam(), { locale: 'en' });
    expect(md).toContain('## Step 1: Overview');
    expect(md).toContain('- Cloud basics');
    expect(md).toContain('- Shared responsibility model');
    expect(md).toContain('- Learn EC2');
  });

  test('accepts an exam array and produces an all-exams study route', () => {
    const examA = makeFixtureExam();
    const examB = {
      id: 'fix-c02', code: 'FIX-C02', title: 'Second Exam',
      steps: [{
        id: 's1', title: 'Storage', jpTitle: 'ストレージ',
        description: ['S3 を学ぶ'],
        resources: [],
      }],
    };
    const md = buildStudyRouteMarkdown([examA, examB], { locale: 'ja' });
    expect(md).toContain('# 全試験 - 学習ルート');
    expect(md).toContain('## FIX-C01 - Fixture Exam');
    expect(md).toContain('## FIX-C02 - Second Exam');
    expect(md).toContain('### ステップ 1: 概要');
    expect(md).toContain('### ステップ 1: ストレージ');
    expect(md).toContain('- S3 を学ぶ');
  });
});

test.describe('buildGlossaryCsv (#165)', () => {
  test('emits the documented header and de-duplicates repeated terms', () => {
    // two exams that share a term "EC2 Docs" → the term must appear once
    const examA = makeFixtureExam();
    const examB = {
      id: 'fix-c02',
      code: 'FIX-C02',
      steps: [
        {
          id: 's1',
          title: 'Compute',
          jpTitle: 'コンピューティング',
          resources: [
            {
              key: 'docs',
              label: 'ドキュメント',
              items: [{ title: 'EC2 Docs', url: 'https://example.com/ec2-b', note: 'again' }],
            },
          ],
        },
      ],
    };
    const csv = buildGlossaryCsv([examA, examB], { locale: 'ja' });
    expect(csv).toContain('\r\n');
    const lines = csv.replace(/\r\n$/, '').split('\r\n');
    expect(lines[0]).toBe(GLOSSARY_CSV_HEADERS.join(','));
    const ec2Rows = lines.filter((l) => l.startsWith('EC2 Docs,'));
    expect(ec2Rows).toHaveLength(1);
    // term/definition/source/examCode order: "EC2 Docs" from examA (fix-c01)
    expect(ec2Rows[0]).toBe('EC2 Docs,compute,https://example.com/ec2,FIX-C01');
  });

  test('accepts a single exam object as well as an array', () => {
    const csv = buildGlossaryCsv(makeFixtureExam(), { locale: 'ja' });
    const lines = csv.replace(/\r\n$/, '').split('\r\n');
    expect(lines[0]).toBe(GLOSSARY_CSV_HEADERS.join(','));
    expect(lines.length).toBeGreaterThan(1);
  });
});

test.describe('studyPack real-data smoke test (#165)', () => {
  test('runs against a real exam (clf-c02) without throwing and produces non-empty output', () => {
    const clf = ALL_EXAMS.find((e) => e.id === 'clf-c02');
    expect(clf).toBeTruthy();

    const md = buildResourceLinksMarkdown(clf, { locale: 'ja' });
    const csv = buildResourceLinksCsv(clf, { locale: 'ja' });
    const route = buildStudyRouteMarkdown(clf, { locale: 'ja' });
    const glossary = buildGlossaryCsv(ALL_EXAMS, { locale: 'ja' });

    expect(md.length).toBeGreaterThan(0);
    expect(md).toContain('# CLF-C02');
    expect(csv).toContain('\r\n');
    expect(csv.split('\r\n')[0]).toBe(RESOURCE_CSV_HEADERS.join(','));
    expect(route.length).toBeGreaterThan(0);
    expect(glossary).toContain('\r\n');
    // glossary across all exams should have many rows
    expect(glossary.split('\r\n').length).toBeGreaterThan(10);
  });

  test('English locale also runs on real data', () => {
    const clf = ALL_EXAMS.find((e) => e.id === 'clf-c02');
    const md = buildResourceLinksMarkdown(clf, { locale: 'en' });
    expect(md).toContain('Resource Links');
    expect(md.length).toBeGreaterThan(0);
  });
});
