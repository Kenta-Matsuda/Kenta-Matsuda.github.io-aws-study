/**
 * Common presentation defaults for resource groups, shared across ALL exams.
 *
 * Background (issue #11):
 * Every exam data file in js/data/*.js repeats the same presentation values for
 * well-known resource groups. For example a "blackbelts" group is virtually
 * always `fas fa-video` / `text-red-500`, "docs" is always `fas fa-book-open` /
 * `text-blue-600`, and "blogs" is `fas fa-book` / `text-orange-500`. Repeating
 * those identical values in every file is tedious and error-prone.
 *
 * This module centralises those defaults so a NEW exam can OMIT the icon/color/
 * label fields on a group whose `key` is one of the known common keys, and the
 * shared default is applied at render time.
 *
 * IMPORTANT: the merge is OPT-IN and NON-DESTRUCTIVE.
 *   - Existing data files are NOT mutated.
 *   - A field explicitly set on a group ALWAYS wins over the shared default.
 *   - Only missing (undefined) fields fall back to the shared default.
 * As a result, every existing exam renders exactly as before.
 *
 * How to author a new exam using these defaults:
 *   If your resource group uses a known key (e.g. `blackbelts`, `docs`,
 *   `blogs`, `whitepapers`, `training`, `practice`, `official-page`, `guide`),
 *   you MAY omit `iconClass`, `iconColorClass`, `label`, and `labelEn`; the
 *   common default for that key is applied automatically. If you want a
 *   different icon/color/label for a specific exam, just set the field
 *   explicitly and it overrides the default.
 *
 * The values below were derived by surveying the existing js/data/*.js files
 * and using the dominant (most common) combination for each key.
 */
export const RESOURCE_GROUP_DEFAULTS = {
  blackbelts: {
    label: 'AWS Black Belt Online Seminar',
    labelEn: 'AWS Black Belt Online Seminar',
    iconClass: 'fas fa-video',
    iconColorClass: 'text-red-500',
  },
  docs: {
    label: '公式ドキュメント',
    labelEn: 'Official Documentation',
    iconClass: 'fas fa-book-open',
    iconColorClass: 'text-blue-600',
  },
  blogs: {
    label: 'AWS Blogs',
    labelEn: 'AWS Blog',
    iconClass: 'fas fa-book',
    iconColorClass: 'text-orange-500',
  },
  whitepapers: {
    label: 'ホワイトペーパー・ガイド',
    labelEn: 'Whitepapers & Guides',
    iconClass: 'fas fa-file-alt',
    iconColorClass: 'text-gray-600',
  },
  training: {
    label: 'AWS トレーニング',
    labelEn: 'AWS Training',
    iconClass: 'fas fa-chalkboard-teacher',
    iconColorClass: 'text-green-600',
  },
  practice: {
    label: '練習問題',
    labelEn: 'Practice Questions',
    iconClass: 'fas fa-tasks',
    iconColorClass: 'text-purple-500',
  },
  'official-page': {
    label: '試験の公式ページ',
    labelEn: 'Official Exam Page',
    iconClass: 'fas fa-file-alt',
    iconColorClass: 'text-blue-500',
  },
  guide: {
    label: '試験ガイド',
    labelEn: 'Exam Guide',
    iconClass: 'fas fa-graduation-cap',
    iconColorClass: 'text-orange-500',
  },
};

/**
 * Return a shallow-merged copy of a resource group with common defaults applied.
 *
 * The merge is pure (does not mutate its input) and non-destructive: an explicit
 * field already present on the group wins over the shared default. Only fields
 * that are missing (undefined) on the group are filled in from the default map
 * for that group's `key`.
 *
 * A field counts as "explicitly set" when it is present and not `undefined`
 * (so `null`, `''`, and `false` are treated as intentional overrides and kept).
 * Groups whose `key` has no known default are returned unchanged (as a copy).
 *
 * @param {object} group - A resource group object (expects a `key` field).
 * @returns {object} A new group object with defaults applied where missing.
 */
export function applyResourceGroupDefaults(group) {
  if (!group || typeof group !== 'object') return group;

  const key = String(group.key || '').trim();
  const defaults = RESOURCE_GROUP_DEFAULTS[key];
  if (!defaults) return { ...group };

  const merged = { ...group };
  for (const field of Object.keys(defaults)) {
    if (merged[field] === undefined) {
      merged[field] = defaults[field];
    }
  }
  return merged;
}
