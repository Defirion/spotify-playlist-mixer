/**
 * Data models supporting coverage tracking & strategy (Phase 1 Task 1).
 */

export type CoveragePriority = 'critical' | 'high' | 'medium' | 'low';
export type CoverageStatus = 'pending' | 'in-progress' | 'complete' | 'blocked';

export interface CoverageTarget {
  /** Glob or explicit file path */
  pattern: string;
  /** Desired statements coverage % */
  targetPct: number;
  /** Current measured % (optional live value when updated) */
  currentPct?: number;
  priority: CoveragePriority;
  rationale: string;
  status: CoverageStatus;
  /** Optional set of requirement IDs from spec */
  requirements?: string[];
}

export interface TestingStrategy {
  coveragePattern: string; // link to CoverageTarget.pattern
  testTypes: Array<'unit' | 'integration' | 'perf' | 'accessibility'>;
  riskNotes: string;
  regressionRisk: 'low' | 'medium' | 'high';
  owner?: string;
  plannedTests: string[]; // human descriptions
  addedTests?: string[]; // once implemented
  status: CoverageStatus;
}

export interface CoverageHistoryEntry {
  date: string; // ISO
  statementsPct: number;
  suites: number;
  tests: number;
  runtimeMs: number | null;
}

export interface CoverageHistoryFile {
  history: CoverageHistoryEntry[];
}

// Seed initial targets (can be refined as coverage rises)
export const initialCoverageTargets: CoverageTarget[] = [
  {
    pattern: 'src/utils/accessibility.ts',
    targetPct: 90,
    priority: 'critical',
    rationale: 'Zero coverage; core a11y utilities must not regress',
    status: 'pending',
    requirements: ['2.1', '2.5', '4.1'],
  },
  {
    pattern: 'src/utils/haptics.ts',
    targetPct: 85,
    priority: 'critical',
    rationale: 'Device capability branching untested',
    status: 'pending',
    requirements: ['2.1', '2.5', '4.1'],
  },
  {
    pattern: 'src/utils/migrateError.ts',
    targetPct: 90,
    priority: 'critical',
    rationale: 'Error normalization correctness & stability',
    status: 'pending',
    requirements: ['2.1', '2.5', '4.1'],
  },
  {
    pattern: 'src/utils/playlistMixer.ts',
    targetPct: 90,
    priority: 'critical',
    rationale: 'Core mixing algorithm risk surface',
    status: 'pending',
    requirements: ['2.1', '2.5', '3.3', '4.1'],
  },
  {
    pattern: 'src/services/spotify.ts',
    targetPct: 80,
    priority: 'critical',
    rationale: 'Auth + API orchestration reliability',
    status: 'pending',
    requirements: ['2.1', '2.3', '4.1', '4.4'],
  },
  {
    pattern: 'src/services/fetchClient.ts',
    targetPct: 85,
    priority: 'critical',
    rationale: 'HTTP, retry & error translation layer',
    status: 'pending',
    requirements: ['2.1', '2.4', '4.1', '4.4'],
  },
  {
    pattern: 'src/hooks/useMixGeneration.ts',
    targetPct: 85,
    priority: 'critical',
    rationale: 'Algorithm initialization pipeline',
    status: 'pending',
    requirements: ['2.1', '2.3', '4.1', '4.2'],
  },
  {
    pattern: 'src/hooks/useMixPreview.ts',
    targetPct: 85,
    priority: 'critical',
    rationale: 'Preview playback behavior',
    status: 'pending',
    requirements: ['2.1', '2.3', '4.1', '4.2'],
  },
];

export const initialTestingStrategies: TestingStrategy[] = [
  {
    coveragePattern: 'src/utils/playlistMixer.ts',
    testTypes: ['unit', 'integration', 'perf'],
    riskNotes: 'Complex ratio calculations & ordering edge cases',
    regressionRisk: 'high',
    plannedTests: [
      'Mix with empty playlists returns empty result',
      'Single playlist passthrough retains order',
      'Ratio distribution matches requested percentages',
      'Non-overlapping track sets produce expected length',
      'Performance remains < threshold for 500 tracks',
    ],
    status: 'pending',
  },
  {
    coveragePattern: 'src/services/fetchClient.ts',
    testTypes: ['unit'],
    riskNotes: 'Retry & timeout logic must not cause cascading failures',
    regressionRisk: 'high',
    plannedTests: [
      'Retries stop after max attempts',
      'Timeout rejects promise with appropriate error',
      'Auth header injected when token present',
      'Network error normalized',
    ],
    status: 'pending',
  },
];
