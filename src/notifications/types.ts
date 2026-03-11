export interface NotificationContext {
  highConfidenceCount: number;
  lowConfidenceCount: number;
  bySeverity: { P0: number; P1: number; P2: number };
  prUrl?: string;
  prNumber?: number;
  repository: string;
  runId: number;
}
