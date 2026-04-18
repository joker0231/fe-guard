import type { FrontendGuardConfig } from 'fe-guard-cli';

const config: FrontendGuardConfig = {
  preset: 'extended',
  checks: {
    eslint: true,
    viteAnalyzers: true,
    depcheck: true,
    tsPrune: true,
    npmAudit: true,
    auditLevel: 'high',
  },
};

export default config;