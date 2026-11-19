import { ISystemConfig } from '../types/diagnostic.types';

export interface ITermRecord {
  term: string;
  marks: number;
  attendance: number;
}

export interface IDiagnosticResult {
  M: number;
  A: number;
  deltaM: number;
  deltaA: number;
  dynamicTotal: number;
  breachMarks: boolean;
  breachAttendance: boolean;
  hasSuddenDrop: boolean;
  riskLabel: string;
  riskColor: string;
  diagnosticLabel: string;
  diagnosticBadgeColor: string;
  alertBannerMessage: string;
}

const TERM_RANK: Record<string, number> = {
  'IA-1': 1,
  'IA1': 1,
  'IA-2': 2,
  'IA2': 2,
  'IA-3': 3,
  'IA3': 3,
  'FINAL': 4,
  'Final': 4,
};

export const runStudentDiagnostics = (
  history: ITermRecord[] = [],
  config: ISystemConfig = {
    thetaM: 5.0,
    thetaA: 7.5,
    wM: 0.6,
    wA: 0.4,
    dropDelta: -1.5,
  }
): IDiagnosticResult => {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      M: 0,
      A: 0,
      deltaM: 0,
      deltaA: 0,
      dynamicTotal: 0,
      breachMarks: false,
      breachAttendance: false,
      hasSuddenDrop: false,
      riskLabel: 'Pending Evaluation',
      riskColor: '#94a3b8',
      diagnosticLabel: 'No Records',
      diagnosticBadgeColor: '#94a3b8',
      alertBannerMessage: 'Attendance or marks not uploaded yet.',
    };
  }

  // Sort chronologically so index [length - 1] is strictly the latest term
  const sorted = [...history].sort((a, b) => {
    const rA = TERM_RANK[a.term] || 99;
    const rB = TERM_RANK[b.term] || 99;
    return rA - rB;
  });

  const latest = sorted[sorted.length - 1];
  const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

  const M = Number(latest.marks ?? 0);
  const A = Number(latest.attendance ?? 0);

  const deltaM = previous ? Number((M - Number(previous.marks ?? 0)).toFixed(2)) : 0;
  const deltaA = previous ? Number((A - Number(previous.attendance ?? 0)).toFixed(2)) : 0;
  const dynamicTotal = Number((config.wM * M + config.wA * A).toFixed(2));

  const breachMarks = M < config.thetaM;
  const breachAttendance = A < config.thetaA;
  const hasSuddenDrop = previous !== null && deltaM <= config.dropDelta;

  let riskLabel = 'On-Track & Competent';
  let riskColor = '#10b981';
  let diagnosticLabel = 'Satisfactory';
  let diagnosticBadgeColor = '#059669';
  let alertBannerMessage = `✅ SAFE: Current performance meets criteria (${latest.term}: ${dynamicTotal}/10).`;

  if (breachMarks && breachAttendance) {
    riskLabel = 'Critical Risk';
    riskColor = '#ef4444';
    diagnosticLabel = 'Dual Non-Compliance';
    diagnosticBadgeColor = '#dc2626';
    alertBannerMessage = `🚨 CRITICAL RISK: Exam (${M}/10) & Attendance (${A}/10) both below required minimum.`;
  } else if (breachMarks) {
    riskLabel = 'Academic Risk';
    riskColor = '#ef4444';
    diagnosticLabel = 'Theory Remedial Req';
    diagnosticBadgeColor = '#dc2626';
    alertBannerMessage = `⚠️ ACADEMIC RISK: Internal score (${M}/10) is below minimum passing cutoff (θM: ${config.thetaM}).`;
  } else if (breachAttendance) {
    riskLabel = 'Attendance Alert';
    riskColor = '#f59e0b';
    diagnosticLabel = 'Attendance Shortage';
    diagnosticBadgeColor = '#d97706';
    alertBannerMessage = `⚠️ ATTENDANCE SHORTAGE: Attendance (${A}/10) below required 75% cutoff (θA: ${config.thetaA}).`;
  } else if (hasSuddenDrop) {
    riskLabel = 'Velocity Decline Alert';
    riskColor = '#ef4444';
    diagnosticLabel = 'Negative Velocity';
    diagnosticBadgeColor = '#dc2626';
    alertBannerMessage = `⚠️ VELOCITY ALERT: Exam marks dropped by ${Math.abs(deltaM)} points since ${previous?.term}.`;
  } else if (dynamicTotal >= 8.5) {
    riskLabel = 'Distinction & Mastery';
    riskColor = '#059669';
    diagnosticLabel = 'Exemplary Standing';
    diagnosticBadgeColor = '#047857';
    alertBannerMessage = `🌟 DISTINCTION: High academic performance (${latest.term}: ${dynamicTotal}/10).`;
  }

  return {
    M,
    A,
    deltaM,
    deltaA,
    dynamicTotal,
    breachMarks,
    breachAttendance,
    hasSuddenDrop,
    riskLabel,
    riskColor,
    diagnosticLabel,
    diagnosticBadgeColor,
    alertBannerMessage,
  };
};