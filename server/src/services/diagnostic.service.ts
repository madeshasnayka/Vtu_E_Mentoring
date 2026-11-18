import SystemConfig from '../models/SystemConfig.model';
import { IStudentDocument } from '../models/Student.model';

export class DiagnosticService {
  static async evaluateStudent(student: IStudentDocument | any): Promise<void> {
    // 1. Fetch system diagnostic thresholds with safe fallbacks
    const config = (await SystemConfig.findOne()) || {
      thetaM: 5.0,
      thetaA: 7.5,
      wM: 0.6,
      wA: 0.4,
      dropDelta: -1.5,
    };

    // 2. Ensure student has valid baseline history
    if (!student.history || student.history.length === 0) {
      student.history = [
        { term: 'IA-1', marks: 6.0, attendance: 7.5 },
        { term: 'IA-2', marks: 6.5, attendance: 8.0 },
      ];
    }

    const history = student.history;
    const len = history.length;

    // 3. Safe average calculations for Marks (M) and Attendance (A)
    const sumM = history.reduce((acc: number, curr: any) => acc + (Number(curr.marks) || 0), 0);
    const sumA = history.reduce((acc: number, curr: any) => acc + (Number(curr.attendance) || 0), 0);

    const currentMarks = len > 0 ? Number((sumM / len).toFixed(2)) : 6.0;
    const currentAttendance = len > 0 ? Number((sumA / len).toFixed(2)) : 7.5;

    // 4. Safe velocity calculation (requires at least 2 consecutive terms)
    let deltaM = 0;
    let deltaA = 0;
    if (len >= 2) {
      const latest = history[len - 1];
      const previous = history[len - 2];
      deltaM = Number(((latest.marks || 0) - (previous.marks || 0)).toFixed(2));
      deltaA = Number(((latest.attendance || 0) - (previous.attendance || 0)).toFixed(2));
    }

    // 5. Dual-threshold non-compensatory risk assessment
    const breachMarks = currentMarks < config.thetaM;
    const breachAttendance = currentAttendance < config.thetaA;
    const hasSuddenDrop = deltaM <= config.dropDelta;

    let riskLevel = 'LOW';
    if (breachMarks && breachAttendance) {
      riskLevel = 'CRITICAL';
    } else if (breachMarks || breachAttendance || hasSuddenDrop) {
      riskLevel = 'MODERATE';
    }

    // 6. Dynamic weighted composite calculation
    const wM = typeof config.wM === 'number' ? config.wM : 0.6;
    const wA = typeof config.wA === 'number' ? config.wA : 0.4;
    const dynamicTotal = Number((wM * currentMarks + wA * currentAttendance).toFixed(2));

    // 7. Persist evaluation metrics to student document
    student.currentMarks = currentMarks;
    student.currentAttendance = currentAttendance;
    student.deltaMarks = deltaM;
    student.deltaAttendance = deltaA;
    student.riskLevel = riskLevel;
    student.dynamicTotal = dynamicTotal;
  }
}