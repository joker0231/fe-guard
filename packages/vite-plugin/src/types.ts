export interface GuardIssue {
  rule: string;
  severity: 'error' | 'warn';
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

export interface Analyzer {
  collect(code: string, id: string): void;
  analyze(): GuardIssue[];
}
