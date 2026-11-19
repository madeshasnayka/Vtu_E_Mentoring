export interface IAssessmentEntry {
  term: string; // e.g. "IA-1", "IA-2", "IA-3"
  marks: number; // 0.0 - 10.0
  attendance: number; // 0.0 - 10.0
  recordedAt?: string;
}

export interface ISystemConfig {
  thetaM: number;       // Passing Marks Threshold (e.g., 5.0)
  thetaA: number;       // Mandatory Attendance Cutoff (e.g., 7.5 / 75%)
  wM: number;           // Academic Mastery Weight (e.g., 0.6)
  wA: number;           // Attendance Weight (e.g., 0.4)
  dropDelta: number;    // Velocity Drop Trigger Delta (e.g., -1.5)
}

export type DiagnosticProfile =
  | 'CRITICAL_DUAL_DISTRESS'
  | 'ACADEMIC_DEFICIENCY'
  | 'ATTENDANCE_SHORTAGE'
  | 'ON_TRACK_SAFE';

export type RiskTier = 'HIGH_RISK' | 'MODERATE_RISK' | 'SAFE';

export interface IDiagnosticResult {
  M: number;
  A: number;
  deltaM: number;
  deltaA: number;
  breachMarks: boolean;
  breachAttendance: boolean;
  hasSuddenDrop: boolean;
  diagnosticProfile: DiagnosticProfile;
  diagnosticLabel: string;
  diagnosticBadgeColor: string;
  diagnosticInsight: string;
  deficiencyScore: number;
  dynamicTotal: number;
  riskTier: RiskTier;
  riskLabel: string;
  riskColor: string;
}