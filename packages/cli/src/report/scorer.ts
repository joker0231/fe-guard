export interface GuardIssue {
  rule: string;
  severity: 'error' | 'warn';
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

export interface CategoryScore {
  name: string;
  score: number;
  maxScore: number;
  issues: GuardIssue[];
}

export interface ScoreResult {
  overall: number; // 0-100
  categories: CategoryScore[];
}

/**
 * Category weights. Total adds up to ~133, normalized to 100 in scoring.
 */
const CATEGORY_WEIGHTS: Record<string, number> = {
  'event-handler': 6,
  'page-reachability': 12,
  'error-boundary': 12,
  'api-safety': 8,
  'component': 6,
  'state-management': 4,
  'render-safety': 10,
  'async-safety': 8,
  'side-effects': 8,
  'security': 4,
  'ai-smell': 6,
  'visual-integrity': 8,
  'interaction-integrity': 6,
  'state-completeness': 8,
  'data-display': 8,
  'async-component-ext': 6,
  'dark-mode': 3,
  'error-recovery': 3,
  'ecosystem-deps': 3,
  'extended': 4,
};

/**
 * Map a rule name to its category based on prefix patterns.
 *
 * Rule naming convention assumed: guard/<category-prefix>-<rule-specific-name>
 * Examples:
 *   guard/no-empty-handler         -> event-handler
 *   guard/handler-must-exist       -> event-handler
 *   guard/no-dead-link             -> page-reachability
 *   guard/require-auth-guard       -> page-reachability
 *   guard/require-error-boundary   -> error-boundary
 *   guard/api-response-validate    -> api-safety
 *   guard/component-prop-check     -> component
 *   guard/state-init-required      -> state-management
 *   guard/render-null-check        -> render-safety
 *   guard/async-catch-required     -> async-safety
 *   guard/effect-deps-check        -> side-effects
 *   guard/no-dangerouslysethtml    -> security
 *   guard/ai-hallucination-detect  -> ai-smell
 *   guard/visual-overflow-check    -> visual-integrity
 *   guard/interaction-feedback     -> interaction-integrity
 *   guard/state-enum-complete      -> state-completeness
 *   guard/data-empty-state         -> data-display
 *   guard/async-component-loading  -> async-component-ext
 *   guard/dark-mode-vars           -> dark-mode
 *   guard/error-recovery-action    -> error-recovery
 *   guard/deps-version-check       -> ecosystem-deps
 */
const RULE_PREFIX_TO_CATEGORY: [RegExp, string][] = [
  // Specific rule name patterns
  [/^guard\/(no-empty-handler|handler-must-exist|handler-)/, 'event-handler'],
  [/^guard\/(no-dead-link|require-auth-guard|page-|route-)/, 'page-reachability'],
  [/^guard\/(require-error-boundary|error-boundary)/, 'error-boundary'],
  [/^guard\/(api-|no-unhandled-api|require-api-)/, 'api-safety'],
  [/^guard\/(component-|no-unused-prop|prop-)/, 'component'],
  [/^guard\/(state-init|no-undefined-state|state-management)/, 'state-management'],
  [/^guard\/(render-|no-render-|require-render-)/, 'render-safety'],
  [/^guard\/(async-catch|no-floating-promise|async-safety|require-async-)/, 'async-safety'],
  [/^guard\/(effect-|no-missing-deps|side-effect|useEffect-)/, 'side-effects'],
  [/^guard\/(no-dangerously|no-eval|security|xss-)/, 'security'],
  [/^guard\/(ai-|hallucination|smell-)/, 'ai-smell'],
  [/^guard\/(visual-|overflow-|layout-)/, 'visual-integrity'],
  [/^guard\/(interaction-|click-|feedback-)/, 'interaction-integrity'],
  [/^guard\/(state-enum|state-complete|exhaustive-)/, 'state-completeness'],
  [/^guard\/(data-|empty-state|no-missing-empty)/, 'data-display'],
  [/^guard\/(async-component|lazy-|suspense-)/, 'async-component-ext'],
  [/^guard\/(dark-mode|theme-)/, 'dark-mode'],
  [/^guard\/(error-recovery|retry-)/, 'error-recovery'],
  [/^guard\/(deps-|ecosystem-|dependency-)/, 'ecosystem-deps'],
];

/**
 * Deduction points per severity.
 */
const DEDUCTIONS = {
  error: 5,
  warn: 2,
} as const;

/**
 * Map a single ESLint rule name to a scoring category.
 */
export function ruleToCategoryName(rule: string): string {
  for (const [pattern, category] of RULE_PREFIX_TO_CATEGORY) {
    if (pattern.test(rule)) {
      return category;
    }
  }
  // Fallback: try to extract a category from the rule name structure
  // e.g., "guard/some-category-rule-name" -> try matching "some-category"
  const parts = rule.replace(/^guard\//, '').split('-');
  if (parts.length >= 2) {
    const candidate = parts.slice(0, 2).join('-');
    if (candidate in CATEGORY_WEIGHTS) {
      return candidate;
    }
    // Try single segment
    if (parts[0] in CATEGORY_WEIGHTS) {
      return parts[0];
    }
  }

  return 'extended';
}

/**
 * Calculate the score report from a list of guard issues.
 */
export function calculateScore(issues: GuardIssue[]): ScoreResult {
  // Bucket issues into categories
  const categoryIssues = new Map<string, GuardIssue[]>();

  // Initialize all categories
  for (const category of Object.keys(CATEGORY_WEIGHTS)) {
    categoryIssues.set(category, []);
  }

  for (const issue of issues) {
    const category = ruleToCategoryName(issue.rule);
    const existing = categoryIssues.get(category) ?? [];
    existing.push(issue);
    categoryIssues.set(category, existing);
  }

  // Calculate per-category scores
  const categories: CategoryScore[] = [];
  let totalScore = 0;
  let totalMaxScore = 0;

  for (const [name, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    const catIssues = categoryIssues.get(name) ?? [];

    let deduction = 0;
    for (const issue of catIssues) {
      deduction += DEDUCTIONS[issue.severity];
    }

    const score = Math.max(0, weight - deduction);

    categories.push({
      name,
      score,
      maxScore: weight,
      issues: catIssues,
    });

    totalScore += score;
    totalMaxScore += weight;
  }

  // Overall is normalized to 0-100
  const overall = totalMaxScore > 0
    ? Math.round((totalScore / totalMaxScore) * 100 * 100) / 100
    : 100;

  return { overall, categories };
}

/**
 * Get all known category names and their weights.
 */
export function getCategoryWeights(): Record<string, number> {
  return { ...CATEGORY_WEIGHTS };
}
